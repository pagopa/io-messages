/* eslint-disable no-console */
/**
 * Vitest globalSetup for the citizen-func characterization suite.
 *
 * Boots shared, expensive dependencies ONCE for the entire run:
 *   - Azure Cosmos DB Emulator (via Testcontainers)
 *   - Azurite (blob + queue + table, via Testcontainers)
 *   - Redis (via Testcontainers)
 *   - The real local Azure Functions host (func start)
 *
 * Connection details are surfaced to test workers via `provide`.
 */
import { CosmosClient } from "@azure/cosmos";
import { GenericContainer, Wait } from "testcontainers";

import {
  APP_DIR,
  FunctionHost,
  getFreePort,
  waitUntilReady,
} from "./support/function-host";
import { COSMOS_EMULATOR_KEY } from "./support/harness";

// Disable TLS verification in this process so the Cosmos emulator's
// self-signed certificate is accepted. Scoped to the globalSetup process only;
// the test workers use the vitest `env` setting defined in vitest.characterization.ts.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ---------------------------------------------------------------------------
// Types shared between globalSetup and test fixtures
// ---------------------------------------------------------------------------

export interface SharedContainers {
  azurite: {
    connectionString: string;
  };
  cosmos: {
    databaseName: string;
    endpoint: string;
    key: string;
  };
  functionHost: {
    baseUrl: string;
  };
  redis: {
    url: string;
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface Stoppable {
  stop: () => Promise<unknown> | unknown;
}

const AZURITE_ACCOUNT_KEY =
  "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";

const buildAzuriteConnectionString = (
  host: string,
  blobPort: number,
  queuePort: number,
  tablePort: number,
): string =>
  [
    "DefaultEndpointsProtocol=http",
    "AccountName=devstoreaccount1",
    `AccountKey=${AZURITE_ACCOUNT_KEY}`,
    `BlobEndpoint=http://${host}:${blobPort}/devstoreaccount1`,
    `QueueEndpoint=http://${host}:${queuePort}/devstoreaccount1`,
    `TableEndpoint=http://${host}:${tablePort}/devstoreaccount1`,
  ].join(";");

const waitForCosmos = (client: CosmosClient): Promise<void> =>
  waitUntilReady(
    async () => {
      await client.getDatabaseAccount();
    },
    40,
    3000,
  );

const COSMOS_DB_NAME = "io-messages-approval";
const COSMOS_RC_DB_NAME = "remote-content-approval";

/** Create the Cosmos DB databases and containers needed by the test suite. */
const provisionCosmos = async (
  endpoint: string,
  key: string,
): Promise<void> => {
  const client = new CosmosClient({ endpoint, key });

  // Main database: message-status container (UpsertMessageStatus scenario)
  const { database } = await client.databases.createIfNotExists({
    id: COSMOS_DB_NAME,
  });
  await database.containers.createIfNotExists({
    id: "message-status",
    partitionKey: { paths: ["/messageId"] },
  });

  // Remote-content database: only needs to exist for the health check
  await client.databases.createIfNotExists({ id: COSMOS_RC_DB_NAME });
};

// ---------------------------------------------------------------------------
// Global setup entry point
// ---------------------------------------------------------------------------

export default async function globalSetup({
  provide,
}: {
  provide: (key: string, value: unknown) => void;
}) {
  const started: Stoppable[] = [];

  // ── Azurite ────────────────────────────────────────────────────────────────
  console.info("[characterization] starting Azurite…");
  const azuriteContainer = await new GenericContainer(
    "mcr.microsoft.com/azure-storage/azurite:3.33.0",
  )
    .withExposedPorts(10000, 10001, 10002)
    .withCommand([
      "azurite",
      "--blobHost",
      "0.0.0.0",
      "--tableHost",
      "0.0.0.0",
      "--queueHost",
      "0.0.0.0",
      "--skipApiVersionCheck",
    ])
    .withWaitStrategy(
      Wait.forLogMessage("Azurite Blob service is successfully listening"),
    )
    .start();
  started.push(azuriteContainer);

  const azuriteHost = azuriteContainer.getHost();
  const azuriteConnectionString = buildAzuriteConnectionString(
    azuriteHost,
    azuriteContainer.getMappedPort(10000),
    azuriteContainer.getMappedPort(10001),
    azuriteContainer.getMappedPort(10002),
  );
  console.info("[characterization] Azurite ready");

  // ── CosmosDB Emulator ──────────────────────────────────────────────────────
  console.info("[characterization] starting Cosmos DB Emulator…");
  const cosmosContainer = await new GenericContainer(
    "mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest",
  )
    .withExposedPorts(8081)
    .withEnvironment({
      AZURE_COSMOS_EMULATOR_ENABLE_DATA_PERSISTENCE: "false",
      AZURE_COSMOS_EMULATOR_PARTITION_COUNT: "10",
    })
    .withStartupTimeout(180_000)
    .start();
  started.push(cosmosContainer);

  const cosmosHost = cosmosContainer.getHost();
  const cosmosPort = cosmosContainer.getMappedPort(8081);
  const cosmosEndpoint = `https://${cosmosHost}:${cosmosPort}`;

  // Application-level warmup: prove the SDK path works before seeding.
  const cosmosProbeClient = new CosmosClient({
    endpoint: cosmosEndpoint,
    key: COSMOS_EMULATOR_KEY,
  });
  await waitForCosmos(cosmosProbeClient);
  await provisionCosmos(cosmosEndpoint, COSMOS_EMULATOR_KEY);
  console.info("[characterization] Cosmos DB Emulator ready:", cosmosEndpoint);

  // ── Redis ──────────────────────────────────────────────────────────────────
  console.info("[characterization] starting Redis…");
  const redisContainer = await new GenericContainer("redis:7.4-alpine")
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
    .start();
  started.push(redisContainer);

  const redisHost = redisContainer.getHost();
  const redisPort = redisContainer.getMappedPort(6379);
  const redisUrl = `redis://${redisHost}:${redisPort}`;
  console.info("[characterization] Redis ready:", redisUrl);

  // ── Build citizen-func ─────────────────────────────────────────────────────
  console.info("[characterization] building citizen-func…");
  const funcPort = await getFreePort();
  const functionHost = new FunctionHost(
    APP_DIR,
    {
      APPLICATIONINSIGHTS_CONNECTION_STRING: "InstrumentationKey=fake-key",
      AzureWebJobsStorage: azuriteConnectionString,
      COSMOSDB_KEY: COSMOS_EMULATOR_KEY,
      COSMOSDB_NAME: COSMOS_DB_NAME,
      COSMOSDB_URI: cosmosEndpoint,
      FUNCTIONS_WORKER_RUNTIME: "node",
      IO_COM_STORAGE_CONNECTION_STRING: azuriteConnectionString,
      MESSAGE_CONTAINER_NAME: "messages",
      MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: azuriteConnectionString,
      NODE_ENV: "development",
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
      PN_SERVICE_ID: "fake-pn-service-id",
      REDIS_PASSWORD: "",
      REDIS_PORT: String(redisPort),
      REDIS_TLS_ENABLED: "false",
      REDIS_URL: redisHost,
      REMOTE_CONTENT_COSMOSDB_KEY: COSMOS_EMULATOR_KEY,
      REMOTE_CONTENT_COSMOSDB_NAME: COSMOS_RC_DB_NAME,
      REMOTE_CONTENT_COSMOSDB_URI: cosmosEndpoint,
      SERVICE_CACHE_TTL_DURATION: "3600",
      SERVICE_TO_RC_CONFIGURATION_MAP: "{}",
      USE_FALLBACK: "false",
    },
    funcPort,
  );

  functionHost.build();
  console.info("[characterization] starting Functions host…");
  await functionHost.start();
  started.push(functionHost);
  console.info(
    "[characterization] Functions host ready:",
    functionHost.baseUrl,
  );

  // ── Surface topology to test workers ──────────────────────────────────────
  const containers: SharedContainers = {
    azurite: { connectionString: azuriteConnectionString },
    cosmos: {
      databaseName: COSMOS_DB_NAME,
      endpoint: cosmosEndpoint,
      key: COSMOS_EMULATOR_KEY,
    },
    functionHost: { baseUrl: functionHost.baseUrl },
    redis: { url: redisUrl },
  };

  console.info("[characterization] all services ready");
  console.info(
    JSON.stringify(
      {
        ...containers,
        cosmos: { ...containers.cosmos, key: "[redacted]" },
      },
      null,
      2,
    ),
  );

  provide("sharedContainers", containers);

  return async () => {
    await Promise.allSettled([...started].reverse().map((s) => s.stop()));
  };
}
