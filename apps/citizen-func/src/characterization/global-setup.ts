/* eslint-disable no-console */
import { CosmosClient } from "@azure/cosmos";
import { BlobServiceClient } from "@azure/storage-blob";
import { QueueServiceClient } from "@azure/storage-queue";
import { GenericContainer, Wait } from "testcontainers";

import {
  APP_DIR,
  FunctionHost,
  getFreePort,
  waitUntilReady,
} from "./support/function-host";
import { COSMOS_EMULATOR_KEY } from "./support/harness";

const AZURITE_IMAGE =
  "mcr.microsoft.com/azure-storage/azurite:latest@sha256:647c63a91102a9d8e8000aab803436e1fc85fbb285e7ce830a82ee5d6661cf37";
const COSMOS_EMULATOR_IMAGE =
  "mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest";
const MESSAGE_STATUS_COLLECTION_NAME = "message-status";
const MESSAGE_STATUS_PARTITION_KEY = "/messageId";
const MESSAGE_STATUS_DATABASE_NAME = "io-messages-approval";
const REMOTE_CONTENT_DATABASE_NAME = "remote-content-approval";
const DEVSTORE_ACCOUNT_NAME = "devstoreaccount1";
const DEVSTORE_ACCOUNT_KEY =
  "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";

interface SharedResource {
  stop: () => Promise<unknown> | unknown;
}

export interface SharedContainers {
  app: {
    baseUrl: string;
    rootDir: string;
  };
  azurite: {
    blobEndpoint: string;
    connectionString: string;
    image: string;
    queueEndpoint: string;
    tableEndpoint: string;
  };
  cosmos: {
    databaseName: string;
    endpoint: string;
    image: string;
    key: string;
    remoteContentDatabaseName: string;
  };
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const candidateHosts = (containerHost: string) => [
  ...new Set(["127.0.0.1", containerHost, "host.docker.internal"]),
];

const waitFor = async (
  label: string,
  work: () => Promise<unknown>,
  timeoutMs: number,
) => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      await work();
      return;
    } catch (error) {
      lastError = error;
      await sleep(1_000);
    }
  }

  throw new Error(
    `${label} did not become ready: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
};

const stopAll = async (resources: readonly SharedResource[]) => {
  await Promise.allSettled(
    [...resources].reverse().map((resource) => resource.stop()),
  );
};

const buildAzuriteConnectionString = (
  host: string,
  blobPort: number,
  queuePort: number,
  tablePort: number,
) =>
  `DefaultEndpointsProtocol=http;AccountName=${DEVSTORE_ACCOUNT_NAME};AccountKey=${DEVSTORE_ACCOUNT_KEY};BlobEndpoint=http://${host}:${String(blobPort)}/${DEVSTORE_ACCOUNT_NAME};QueueEndpoint=http://${host}:${String(queuePort)}/${DEVSTORE_ACCOUNT_NAME};TableEndpoint=http://${host}:${String(tablePort)}/${DEVSTORE_ACCOUNT_NAME};`;

const probeAzurite = async (connectionString: string) => {
  await BlobServiceClient.fromConnectionString(
    connectionString,
  ).getProperties();
  await QueueServiceClient.fromConnectionString(
    connectionString,
  ).getProperties();
};

const resolveAzuriteConnection = async (
  containerHost: string,
  blobPort: number,
  queuePort: number,
  tablePort: number,
) => {
  let lastError: unknown;
  let resolved:
    | {
        connectionString: string;
        host: string;
      }
    | undefined;

  await waitFor(
    "Azurite reachability",
    async () => {
      for (const host of candidateHosts(containerHost)) {
        const connectionString = buildAzuriteConnectionString(
          host,
          blobPort,
          queuePort,
          tablePort,
        );

        try {
          await probeAzurite(connectionString);
          resolved = {
            connectionString,
            host,
          };
          return;
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error("No reachable Azurite host found");
    },
    60_000,
  );

  if (resolved === undefined) {
    throw new Error("Azurite endpoint resolution failed");
  }

  return resolved;
};

const probeCosmos = async (endpoint: string, key: string) => {
  const client = new CosmosClient({
    connectionPolicy: {
      enableEndpointDiscovery: false,
    },
    endpoint,
    key,
  });

  await client.getDatabaseAccount();
};

const resolveCosmosEndpoint = async (
  containerHost: string,
  port: number,
  key: string,
) => {
  let lastError: unknown;
  let resolved: string | undefined;

  await waitFor(
    "Cosmos emulator reachability",
    async () => {
      for (const host of candidateHosts(containerHost)) {
        const endpoint = `https://${host}:${String(port)}/`;

        try {
          await probeCosmos(endpoint, key);
          resolved = endpoint;
          return;
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error("No reachable Cosmos host found");
    },
    180_000,
  );

  if (resolved === undefined) {
    throw new Error("Cosmos endpoint resolution failed");
  }

  return resolved;
};

const warmMessageStatusContainer = async (endpoint: string, key: string) => {
  const client = new CosmosClient({
    connectionPolicy: {
      enableEndpointDiscovery: false,
    },
    endpoint,
    key,
  });
  const container = client
    .database(MESSAGE_STATUS_DATABASE_NAME)
    .container(MESSAGE_STATUS_COLLECTION_NAME);
  const probeMessageId = "__approval-warmup__";
  const probeDocumentId = `${probeMessageId}-0000000000000000`;

  await waitFor(
    "Cosmos message-status container",
    async () => {
      await container.items.upsert({
        fiscalCode: "SPNDNL80R13C555X",
        id: probeDocumentId,
        isArchived: false,
        isRead: false,
        messageId: probeMessageId,
        status: "PROCESSED",
        updatedAt: "2024-01-01T00:00:00.000Z",
        version: 0,
      });

      await container.items
        .query(
          {
            parameters: [
              {
                name: "@messageId",
                value: probeMessageId,
              },
            ],
            query:
              "SELECT TOP 1 * FROM c WHERE c.messageId = @messageId ORDER BY c.version DESC",
          },
          {
            maxItemCount: 1,
            partitionKey: probeMessageId,
          },
        )
        .fetchAll();

      await container.item(probeDocumentId, probeMessageId).delete();
    },
    120_000,
  );
};

const provisionCosmos = async (endpoint: string, key: string) => {
  const client = new CosmosClient({
    connectionPolicy: {
      enableEndpointDiscovery: false,
    },
    endpoint,
    key,
  });

  const { database } = await client.databases.createIfNotExists({
    id: MESSAGE_STATUS_DATABASE_NAME,
  });

  await database.containers.createIfNotExists({
    id: MESSAGE_STATUS_COLLECTION_NAME,
    partitionKey: {
      paths: [MESSAGE_STATUS_PARTITION_KEY],
    },
  });

  await client.databases.createIfNotExists({
    id: REMOTE_CONTENT_DATABASE_NAME,
  });
};

export default async function globalSetup({
  provide,
}: {
  provide: (key: string, value: unknown) => void;
}) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  const started: SharedResource[] = [];

  console.info("[characterization] starting Azurite...");
  const azurite = await new GenericContainer(AZURITE_IMAGE)
    .withCommand([
      "azurite",
      "--blobHost",
      "0.0.0.0",
      "--queueHost",
      "0.0.0.0",
      "--tableHost",
      "0.0.0.0",
      "--skipApiVersionCheck",
    ])
    .withExposedPorts(10000, 10001, 10002)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
  started.push(azurite);

  const dockerHost = azurite.getHost();
  const azuriteBlobPort = azurite.getMappedPort(10000);
  const azuriteQueuePort = azurite.getMappedPort(10001);
  const azuriteTablePort = azurite.getMappedPort(10002);
  const azuriteConnection = await resolveAzuriteConnection(
    dockerHost,
    azuriteBlobPort,
    azuriteQueuePort,
    azuriteTablePort,
  );
  const azuriteConnectionString = azuriteConnection.connectionString;

  console.info(
    `[characterization] Azurite ready via ${azuriteConnection.host}`,
  );

  console.info("[characterization] starting Cosmos emulator...");
  const cosmos = await new GenericContainer(COSMOS_EMULATOR_IMAGE)
    .withExposedPorts(8081)
    .withStartupTimeout(180_000)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
  started.push(cosmos);

  const cosmosEndpoint = await resolveCosmosEndpoint(
    cosmos.getHost(),
    cosmos.getMappedPort(8081),
    COSMOS_EMULATOR_KEY,
  );
  await provisionCosmos(cosmosEndpoint, COSMOS_EMULATOR_KEY);
  await warmMessageStatusContainer(cosmosEndpoint, COSMOS_EMULATOR_KEY);
  console.info(
    `[characterization] Cosmos emulator ready via ${cosmosEndpoint}`,
  );

  const funcPort = await getFreePort();
  const functionHost = new FunctionHost({
    env: {
      APPLICATIONINSIGHTS_CONNECTION_STRING: "InstrumentationKey=testkey",
      AzureWebJobsStorage: azuriteConnectionString,
      COSMOSDB_KEY: COSMOS_EMULATOR_KEY,
      COSMOSDB_NAME: MESSAGE_STATUS_DATABASE_NAME,
      COSMOSDB_URI: cosmosEndpoint,
      FUNCTIONS_WORKER_RUNTIME: "node",
      MESSAGE_CONTAINER_NAME: "messages",
      MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: azuriteConnectionString,
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
      PN_SERVICE_ID: "a-pn-id",
      REDIS_PASSWORD: "local",
      REDIS_PORT: "6379",
      REDIS_TLS_ENABLED: "false",
      REDIS_URL: "127.0.0.1",
      REMOTE_CONTENT_COSMOSDB_KEY: COSMOS_EMULATOR_KEY,
      REMOTE_CONTENT_COSMOSDB_NAME: REMOTE_CONTENT_DATABASE_NAME,
      REMOTE_CONTENT_COSMOSDB_URI: cosmosEndpoint,
      SERVICE_CACHE_TTL_DURATION: "6000",
      SERVICE_TO_RC_CONFIGURATION_MAP: "{}",
      USE_FALLBACK: "true",
    },
    port: funcPort,
  });
  await functionHost.start();
  started.push(functionHost);

  await waitUntilReady(functionHost.baseUrl);
  console.info("[characterization] Function host ready");

  const sharedContainers: SharedContainers = {
    app: {
      baseUrl: functionHost.baseUrl,
      rootDir: APP_DIR,
    },
    azurite: {
      blobEndpoint: `http://${azuriteConnection.host}:${String(azuriteBlobPort)}/${DEVSTORE_ACCOUNT_NAME}`,
      connectionString: azuriteConnectionString,
      image: AZURITE_IMAGE,
      queueEndpoint: `http://${azuriteConnection.host}:${String(azuriteQueuePort)}/${DEVSTORE_ACCOUNT_NAME}`,
      tableEndpoint: `http://${azuriteConnection.host}:${String(azuriteTablePort)}/${DEVSTORE_ACCOUNT_NAME}`,
    },
    cosmos: {
      databaseName: MESSAGE_STATUS_DATABASE_NAME,
      endpoint: cosmosEndpoint,
      image: COSMOS_EMULATOR_IMAGE,
      key: COSMOS_EMULATOR_KEY,
      remoteContentDatabaseName: REMOTE_CONTENT_DATABASE_NAME,
    },
  };

  console.info("[characterization] shared containers ready");
  console.info(JSON.stringify(sharedContainers, null, 2));

  provide("sharedContainers", sharedContainers);

  return async () => {
    await stopAll(started);
  };
}
