import type { Container } from "@azure/cosmos";

import { CosmosClient } from "@azure/cosmos";
import { BlobServiceClient } from "@azure/storage-blob";
import { QueueServiceClient } from "@azure/storage-queue";
import {
  AzureCosmosDbEmulatorContainer,
  type StartedAzureCosmosDbEmulatorContainer,
} from "@testcontainers/azure-cosmosdb-emulator";
import {
  AzuriteContainer,
  type StartedAzuriteContainer,
} from "@testcontainers/azurite";
import {
  type IncomingMessage,
  type Server,
  type ServerResponse,
  createServer,
} from "node:http";
import { createServer as createNetServer } from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import type { ScenarioLayers } from "./cassettes";

import { FunctionHost } from "./function-host";
import {
  type NormalizationContext,
  createNormalizationLayer,
  normalizeObservedValue,
  normalizeRequestHeaders,
  normalizeResponseHeaders,
} from "./normalization";

const APP_ROOT = path.join(__dirname, "..", "..", "..");

const AZURITE_IMAGE =
  "mcr.microsoft.com/azure-storage/azurite:latest@sha256:647c63a91102a9d8e8000aab803436e1fc85fbb285e7ce830a82ee5d6661cf37";
const COSMOS_EMULATOR_IMAGE =
  "mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:vnext-preview";
const LOADED_FUNCTIONS = ["Info", "CreateMessage"] as const;

const SERVICE_ID = "01234567890";
const USER_ID = "characterization-user";
const USER_EMAIL = "characterization@example.com";
const AUTHORIZED_FISCAL_CODE = "AAABBB01C02D345D";

const SUCCESS_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 1_000;

export interface ScenarioDefinition {
  readonly expectSideEffects: boolean;
  readonly expectedStatus: number;
  readonly name: string;
  readonly request: {
    readonly body: Record<string, unknown>;
    readonly headers: Record<string, string>;
    readonly method: "POST";
    readonly path: string;
  };
}

interface ScenarioResources {
  readonly databaseName: string;
  readonly messageContentContainerName: string;
  readonly messageCreatedQueueName: string;
  readonly messageProcessedQueueName: string;
  readonly messagesContainer: Container;
  readonly notificationCreatedEmailQueueName: string;
  readonly notificationCreatedWebhookQueueName: string;
  readonly processingMessageContainerName: string;
}

class NotifyStub {
  private constructor(
    private readonly server: Server,
    readonly baseUrl: string,
  ) {}

  static async start(): Promise<NotifyStub> {
    const server = createServer(
      (_request: IncomingMessage, response: ServerResponse) => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ name: "notify-stub", version: "1.0.0" }));
      },
    );

    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", (error?: Error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Unable to determine the local notify stub address.");
    }

    return new NotifyStub(server, `http://127.0.0.1:${address.port}`);
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

const getFreePort = async (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createNetServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (address === null || typeof address === "string") {
        reject(new Error("Unable to allocate a free local port."));
        return;
      }

      server.close((error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }

        resolve(address.port);
      });
    });
  });

const waitForValue = async <T>(
  read: () => Promise<T>,
  isReady: (value: T) => boolean,
  description: string,
): Promise<T> => {
  const startedAt = Date.now();
  let lastValue: T | undefined;

  while (Date.now() - startedAt < SUCCESS_TIMEOUT_MS) {
    const value = await read();
    lastValue = value;

    if (isReady(value)) {
      return value;
    }

    await delay(POLL_INTERVAL_MS);
  }

  throw new Error(
    `Timed out waiting for ${description}. Last observed value: ${JSON.stringify(lastValue, null, 2)}`,
  );
};

const decodeQueueMessageText = (messageText: string): unknown => {
  const attempts = [
    () => JSON.parse(messageText),
    () => JSON.parse(Buffer.from(messageText, "base64").toString("utf8")),
  ];

  for (const attempt of attempts) {
    try {
      return attempt();
    } catch {
      // Try the next decoding strategy.
    }
  }

  return messageText;
};

const toJsonBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
};

const isRecordMode = (): boolean =>
  process.env.CHARACTERIZATION_MODE === "record";

const toScenarioSuffix = (scenarioName: string): string =>
  scenarioName.replace(/[^a-z0-9-]/g, "-");

export class CreateMessageCharacterizationHarness {
  private constructor(
    private readonly azurite: StartedAzuriteContainer,
    private readonly cosmos: StartedAzureCosmosDbEmulatorContainer,
    private readonly notifyStub: NotifyStub,
    private readonly blobServiceClient: BlobServiceClient,
    private readonly cosmosClient: CosmosClient,
    private readonly queueServiceClient: QueueServiceClient,
  ) {}

  static async start(): Promise<CreateMessageCharacterizationHarness> {
    const azurite = await new AzuriteContainer(AZURITE_IMAGE)
      .withInMemoryPersistence()
      .withSkipApiVersionCheck()
      .start();

    const cosmos = await new AzureCosmosDbEmulatorContainer(
      COSMOS_EMULATOR_IMAGE,
    )
      .withProtocol("http")
      .withTelemetryEnabled(false)
      .start();

    const notifyStub = await NotifyStub.start();

    const harness = new CreateMessageCharacterizationHarness(
      azurite,
      cosmos,
      notifyStub,
      BlobServiceClient.fromConnectionString(azurite.getConnectionString()),
      new CosmosClient({
        connectionPolicy: { enableEndpointDiscovery: false },
        endpoint: cosmos.getEndpoint(),
        key: cosmos.getKey(),
      }),
      QueueServiceClient.fromConnectionString(azurite.getConnectionString()),
    );

    await harness.warmupDependencies();

    return harness;
  }

  private buildTopology(resources: ScenarioResources): Record<string, unknown> {
    return {
      dependencies: {
        azurite: {
          accountName: this.azurite.getAccountName(),
          blobEndpoint: "http://__AZURITE_BLOB_ENDPOINT__/devstoreaccount1",
          image: AZURITE_IMAGE,
          messageContentContainer: resources.messageContentContainerName,
          mode: "Testcontainers",
          processingMessageContainer: resources.processingMessageContainerName,
          queueEndpoint: "http://__AZURITE_QUEUE_ENDPOINT__/devstoreaccount1",
          queues: [
            resources.messageCreatedQueueName,
            resources.messageProcessedQueueName,
            resources.notificationCreatedEmailQueueName,
            resources.notificationCreatedWebhookQueueName,
          ],
        },
        cosmos: {
          containers: ["services", "messages"],
          database: resources.databaseName,
          endpoint: "http://__COSMOS_ENDPOINT__",
          image: COSMOS_EMULATOR_IMAGE,
          mode: "Testcontainers",
        },
        notifyStub: {
          baseUrl: "http://__NOTIFY_STUB__",
          mode: "local stub",
        },
      },
      runtime: {
        app: "services-func",
        baseUrl: "http://__FUNCTIONS_HOST__/api",
        bootCommand: [
          "func",
          "start",
          "--port",
          "<dynamic>",
          "--functions",
          ...LOADED_FUNCTIONS,
        ],
        boundary: "Azure Functions HTTP trigger",
      },
    };
  }

  private async collectSideEffects(
    resources: ScenarioResources,
    normalizationContext: NormalizationContext,
    expectSideEffects: boolean,
  ): Promise<Record<string, unknown>> {
    if (expectSideEffects) {
      await waitForValue(
        async () => this.readRawSideEffects(resources),
        (value) =>
          value.createdQueueMessages.length === 1 &&
          value.messages.length === 1 &&
          value.processingBlobs.length === 1,
        `${resources.databaseName} side effects`,
      );
    } else {
      await delay(1_500);
    }

    const rawSideEffects = await this.readRawSideEffects(resources);

    return normalizeObservedValue(
      rawSideEffects,
      normalizationContext,
    ) as Record<string, unknown>;
  }

  private createFunctionHostEnv(
    resources: ScenarioResources,
  ): NodeJS.ProcessEnv {
    const storageConnectionString = this.azurite.getConnectionString();

    return {
      ...process.env,
      APIM_BASE_URL: this.notifyStub.baseUrl,
      APIM_SUBSCRIPTION_KEY: "local-apim-subscription-key",
      APPINSIGHTS_SAMPLING_PERCENTAGE: "0",
      APPLICATIONINSIGHTS_CONNECTION_STRING:
        "InstrumentationKey=00000000-0000-0000-0000-000000000000",
      AzureWebJobsStorage: storageConnectionString,
      COSMOSDB_EMULATOR_ALLOW_MISSING_SELF: "true",
      COSMOSDB_ENABLE_ENDPOINT_DISCOVERY: "false",
      COSMOSDB_KEY: this.cosmos.getKey(),
      COSMOSDB_NAME: resources.databaseName,
      COSMOSDB_URI: this.cosmos.getEndpoint(),
      EMAIL_NOTIFICATION_SERVICE_BLACKLIST: "",
      FF_OPT_IN_EMAIL_ENABLED: "false",
      FUNCTIONS_WORKER_RUNTIME: "node",
      IO_COM_STORAGE_CONNECTION_STRING: storageConnectionString,
      MAIL_FROM: "IO - l'app dei servizi pubblici <no-reply@io.italia.it>",
      MAILHOG_HOSTNAME: "127.0.0.1",
      MESSAGE_CONTAINER_NAME: resources.messageContentContainerName,
      MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: storageConnectionString,
      MESSAGE_CREATED_QUEUE_NAME: resources.messageCreatedQueueName,
      MESSAGE_PROCESSED_QUEUE_NAME: resources.messageProcessedQueueName,
      MIN_APP_VERSION_WITH_READ_AUTH: "1.0.0",
      NODE_ENV: "development",
      NOTIFICATION_CREATED_EMAIL_QUEUE_NAME:
        resources.notificationCreatedEmailQueueName,
      NOTIFICATION_CREATED_WEBHOOK_QUEUE_NAME:
        resources.notificationCreatedWebhookQueueName,
      NOTIFY_API_KEY: "local-notify-api-key",
      NOTIFY_API_URL: this.notifyStub.baseUrl,
      OPT_OUT_EMAIL_SWITCH_DATE: "1625781600",
      PAGOPA_ECOMMERCE_API_KEY: "local-pagopa-ecommerce-key",
      PAGOPA_ECOMMERCE_BASE_URL: this.notifyStub.baseUrl,
      PENDING_ACTIVATION_GRACE_PERIOD_SECONDS: "86400",
      PROCESSING_MESSAGE_CONTAINER_NAME:
        resources.processingMessageContainerName,
      SANDBOX_FISCAL_CODE: "AAAAAA00A00A000A",
      TTL_FOR_USER_NOT_FOUND: "3600",
      WEBHOOK_CHANNEL_URL: "https://example.com/webhook",
    };
  }

  private getMessageId(body: unknown): string | undefined {
    if (body !== null && typeof body === "object") {
      const maybeId = (body as Record<string, unknown>).id;
      if (typeof maybeId === "string") {
        return maybeId;
      }
    }

    return undefined;
  }

  private async prepareScenarioResources(
    scenarioName: string,
  ): Promise<ScenarioResources> {
    const suffix = toScenarioSuffix(scenarioName);
    const databaseName = `services-func-char-${suffix}`;
    const messageContentContainerName = `messages-${suffix}`;
    const processingMessageContainerName = `processing-message-${suffix}`;
    const messageCreatedQueueName = `message-created-${suffix}`;
    const messageProcessedQueueName = `message-processed-${suffix}`;
    const notificationCreatedEmailQueueName = `notification-created-email-${suffix}`;
    const notificationCreatedWebhookQueueName = `notification-created-webhook-${suffix}`;

    const { database } = await this.cosmosClient.databases.createIfNotExists({
      id: databaseName,
    });

    const { container: servicesContainer } =
      await database.containers.createIfNotExists({
        id: "services",
        partitionKey: "/serviceId",
      });

    const { container: messagesContainer } =
      await database.containers.createIfNotExists({
        id: "messages",
        partitionKey: "/fiscalCode",
      });

    await this.seedServiceDocument(servicesContainer);
    await this.waitForServiceQuery(servicesContainer);

    await Promise.all([
      this.blobServiceClient
        .getContainerClient(messageContentContainerName)
        .createIfNotExists(),
      this.blobServiceClient
        .getContainerClient(processingMessageContainerName)
        .createIfNotExists(),
      this.queueServiceClient
        .getQueueClient(messageCreatedQueueName)
        .createIfNotExists(),
      this.queueServiceClient
        .getQueueClient(messageProcessedQueueName)
        .createIfNotExists(),
      this.queueServiceClient
        .getQueueClient(notificationCreatedEmailQueueName)
        .createIfNotExists(),
      this.queueServiceClient
        .getQueueClient(notificationCreatedWebhookQueueName)
        .createIfNotExists(),
    ]);

    return {
      databaseName,
      messageContentContainerName,
      messageCreatedQueueName,
      messageProcessedQueueName,
      messagesContainer,
      notificationCreatedEmailQueueName,
      notificationCreatedWebhookQueueName,
      processingMessageContainerName,
    };
  }

  private async readProcessingBlobs(
    containerName: string,
  ): Promise<readonly Record<string, unknown>[]> {
    const containerClient =
      this.blobServiceClient.getContainerClient(containerName);
    const blobs: Record<string, unknown>[] = [];

    for await (const blob of containerClient.listBlobsFlat()) {
      const blobContent = await containerClient
        .getBlobClient(blob.name)
        .downloadToBuffer();

      blobs.push({
        content: JSON.parse(blobContent.toString("utf8")),
        name: blob.name,
      });
    }

    return blobs.sort((left, right) =>
      String(left.name).localeCompare(String(right.name)),
    );
  }

  private async readQueueMessages(
    queueName: string,
  ): Promise<readonly unknown[]> {
    const response = await this.queueServiceClient
      .getQueueClient(queueName)
      .peekMessages({ numberOfMessages: 32 });

    return response.peekedMessageItems.map((message) =>
      decodeQueueMessageText(message.messageText),
    );
  }

  private async readRawSideEffects(resources: ScenarioResources): Promise<{
    readonly createdQueueMessages: readonly unknown[];
    readonly messages: readonly Record<string, unknown>[];
    readonly processingBlobs: readonly Record<string, unknown>[];
  }> {
    const [{ resources: messages }, processingBlobs, createdQueueMessages] =
      await Promise.all([
        resources.messagesContainer.items
          .query<Record<string, unknown>>({
            query: "SELECT * FROM c ORDER BY c.id",
          })
          .fetchAll(),
        this.readProcessingBlobs(resources.processingMessageContainerName),
        this.readQueueMessages(resources.messageCreatedQueueName),
      ]);

    return {
      createdQueueMessages,
      messages,
      processingBlobs,
    };
  }

  private async seedServiceDocument(
    servicesContainer: Container,
  ): Promise<void> {
    await servicesContainer.items.upsert({
      authorizedCIDRs: [],
      authorizedRecipients: [AUTHORIZED_FISCAL_CODE],
      departmentName: "Characterization Department",
      id: `${SERVICE_ID}-0000000000000000`,
      isVisible: true,
      maxAllowedPaymentAmount: 0,
      organizationFiscalCode: SERVICE_ID,
      organizationName: "Characterization Org",
      requireSecureChannels: true,
      serviceId: SERVICE_ID,
      serviceMetadata: {
        category: "STANDARD",
        description: "Characterization service description",
        privacyUrl: "https://example.com/privacy",
        scope: "NATIONAL",
        supportUrl: "https://example.com/support",
      },
      serviceName: "Characterization Service",
      version: 0,
    });
  }

  private async waitForServiceQuery(
    servicesContainer: Container,
  ): Promise<void> {
    await waitForValue(
      async () =>
        servicesContainer.items
          .query({
            parameters: [{ name: "@serviceId", value: SERVICE_ID }],
            query:
              "SELECT TOP 1 * FROM c WHERE c.serviceId = @serviceId ORDER BY c.version DESC",
          })
          .fetchAll(),
      (value) => value.resources.length === 1,
      "the seeded service query to become available",
    );
  }

  private async warmupDependencies(): Promise<void> {
    await waitForValue(
      async () => {
        try {
          await Promise.all([
            this.blobServiceClient.getProperties(),
            this.queueServiceClient.getProperties(),
          ]);
          return true;
        } catch {
          return false;
        }
      },
      (value) => value,
      "Azurite readiness",
    );

    await waitForValue(
      async () => {
        try {
          const { database } =
            await this.cosmosClient.databases.createIfNotExists({
              id: "services-func-char-warmup",
            });

          const { container } = await database.containers.createIfNotExists({
            id: "warmup",
            partitionKey: "/id",
          });

          await container.items
            .query({ query: "SELECT VALUE COUNT(1) FROM c" })
            .fetchAll();
          return true;
        } catch {
          return false;
        }
      },
      (value) => value,
      "Azure Cosmos DB emulator readiness",
    );
  }

  async runScenario(scenario: ScenarioDefinition): Promise<ScenarioLayers> {
    const resources = await this.prepareScenarioResources(scenario.name);
    const hostPort = await getFreePort();
    const host = new FunctionHost(
      APP_ROOT,
      this.createFunctionHostEnv(resources),
      hostPort,
      LOADED_FUNCTIONS,
    );

    await host.start();

    try {
      const response = await fetch(
        `${host.apiBaseUrl}${scenario.request.path}`,
        {
          body: JSON.stringify(scenario.request.body),
          headers: scenario.request.headers,
          method: scenario.request.method,
          signal: AbortSignal.timeout(10_000),
        },
      );

      const rawBody = await toJsonBody(response);

      if (response.status !== scenario.expectedStatus) {
        throw new Error(
          `Scenario "${scenario.name}" returned ${response.status} instead of ${scenario.expectedStatus}.\n\n${JSON.stringify(rawBody, null, 2)}`,
        );
      }

      const messageId = this.getMessageId(rawBody);
      const normalizationContext: NormalizationContext = { messageId };

      const sideEffects = await this.collectSideEffects(
        resources,
        normalizationContext,
        scenario.expectSideEffects,
      );

      if (scenario.expectSideEffects && messageId === undefined) {
        throw new Error(
          `Scenario "${scenario.name}" did not return a message id in the success payload.`,
        );
      }

      return {
        normalization: createNormalizationLayer(),
        request: {
          body: scenario.request.body,
          headers: normalizeRequestHeaders(scenario.request.headers),
          method: scenario.request.method,
          path: scenario.request.path,
        },
        response: {
          body: normalizeObservedValue(rawBody, normalizationContext),
          headers: normalizeResponseHeaders(
            response.headers,
            normalizationContext,
          ),
          status: response.status,
        },
        sideEffects,
        topology: this.buildTopology(resources),
      };
    } finally {
      await host.stop();
    }
  }

  async stop(): Promise<void> {
    await Promise.allSettled([
      this.notifyStub.stop(),
      this.cosmos.stop(),
      this.azurite.stop(),
    ]);
  }
}

export const createStandardHeaders = (
  groups: readonly string[],
): Record<string, string> => ({
  "content-type": "application/json",
  "x-forwarded-for": "127.0.0.1",
  "x-subscription-id": SERVICE_ID,
  "x-user-email": USER_EMAIL,
  "x-user-groups": groups.join(","),
  "x-user-id": USER_ID,
});

export const createHappyPathBody = (): Record<string, unknown> => ({
  content: {
    markdown:
      "This is a characterization markdown body that is intentionally long enough to satisfy CreateMessage validation rules.",
    subject: "Welcome user",
  },
});

export const getAuthorizedFiscalCode = (): string => AUTHORIZED_FISCAL_CODE;

export const getVerifyMode = (): "record" | "verify" =>
  isRecordMode() ? "record" : "verify";
