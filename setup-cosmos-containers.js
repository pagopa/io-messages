// this script creates the necessary database and containers in the Cosmos DB emulator

const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOSDB_URI || "http://cosmos:8081";
const key =
  process.env.COSMOSDB_KEY ||
  "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";
const databaseId = process.env.COSMOSDB_NAME || "io-messages";
const remoteContentDatabaseId = "remote-content";
const healthUrl = process.env.COSMOSDB_HEALTH_URL || "http://cosmos:8080/ready";

const cosmosClient = new CosmosClient({
  connectionPolicy: {
    enableEndpointDiscovery: false,
  },
  endpoint,
  key,
});

const containers = [
  { id: "messages", partitionKey: "/fiscalCode" },
  { id: "message-status", partitionKey: "/messageId" },
  { id: "profiles", partitionKey: "/fiscalCode" },
  { id: "services", partitionKey: "/serviceId" },
  { id: "notifications", partitionKey: "/messageId" },
];

const remoteContentContainers = [
  { id: "message-configuration", partitionKey: "/configurationId" },
  { id: "user-configurations", partitionKey: "/userId" },
];

const paymentFixtureFiscalCode = "LVTEST00A00A200X";
const paymentFixtureMessageId = "01M0YRTA395JBSZNWG7W63ZJDV";
const paymentFixtureServiceId = "01JR0QRJ8MX1PD06DE6X5FWXS5";
const sendFixtureFiscalCode = "LVTEST00A00A199X";
const sendFixtureMessageId = "01JXVZETAP064HCWTXBWC693QH";
const sendFixtureIun = "ABCD-EFGH-IJKL-123456-M-7";
const sendFixtureConfigurationId = "01HC4K5M6N7P8Q9R0S1T2V3W4X";
const genericFixtureMessageId = "01JXVZETAP064HCWTXBWC693QJ";
const genericFixtureServiceId = "01JR0QRJ8MX1PD06DE6X5FWXS6";
const genericFixtureConfigurationId = "01HC4K5M6N7P8Q9R0S1T2V3W4Y";
const lollipopFixtureMessageId = "01JXVZETAP064HCWTXBWC693QK";
const lollipopFixtureConfigurationId = "01HC4K5M6N7P8Q9R0S1T2V3W4Z";

const profiles = [
  {
    containerId: "profiles",
    document: {
      fiscalCode: "LVTEST00A00A200X",
      isEmailEnabled: true,
      isEmailValidated: true,
      isInboxEnabled: true,
      isTestProfile: false,
      isWebhookEnabled: true,
      email: "lvtest@example.com",
      servicePreferencesSettings: {
        mode: "AUTO",
        version: 1,
      },
      lastAppVersion: "UNKNOWN",
      pushNotificationsContentType: "UNSET",
      reminderStatus: "ENABLED",
      id: "LVTEST00A00A200X-0000000000000000",
      version: 0,
      kind: "INewProfile",
    },
  },
  {
    containerId: "profiles",
    document: {
      fiscalCode: "LVTEST00A00A199X",
      isEmailEnabled: true,
      isEmailValidated: true,
      isInboxEnabled: true,
      isTestProfile: false,
      isWebhookEnabled: true,
      email: "lvtest@example.com",
      servicePreferencesSettings: {
        mode: "AUTO",
        version: 1,
      },
      lastAppVersion: "UNKNOWN",
      pushNotificationsContentType: "UNSET",
      reminderStatus: "ENABLED",
      id: "LVTEST00A00A199X-0000000000000000",
      version: 0,
      kind: "INewProfile",
    },
  },
  {
    containerId: "profiles",
    document: {
      fiscalCode: "LVTEST00A00A198X",
      isEmailEnabled: true,
      isEmailValidated: true,
      isInboxEnabled: true,
      isTestProfile: false,
      isWebhookEnabled: true,
      email: "lvtest@example.com",
      servicePreferencesSettings: {
        mode: "AUTO",
        version: 1,
      },
      lastAppVersion: "UNKNOWN",
      pushNotificationsContentType: "UNSET",
      reminderStatus: "ENABLED",
      id: "LVTEST00A00A198X-0000000000000000",
      version: 0,
      kind: "INewProfile",
    },
  },
  {
    containerId: "profiles",
    document: {
      fiscalCode: "LVTEST00A00A197X",
      isEmailEnabled: true,
      isEmailValidated: true,
      isInboxEnabled: true,
      isTestProfile: false,
      isWebhookEnabled: true,
      email: "lvtest@example.com",
      servicePreferencesSettings: {
        mode: "AUTO",
        version: 1,
      },
      lastAppVersion: "UNKNOWN",
      pushNotificationsContentType: "UNSET",
      reminderStatus: "ENABLED",
      id: "LVTEST00A00A197X-0000000000000000",
      version: 0,
      kind: "INewProfile",
    },
  },
  {
    containerId: "profiles",
    document: {
      fiscalCode: "LVTEST00A00A196X",
      isEmailEnabled: true,
      isEmailValidated: true,
      isInboxEnabled: true,
      isTestProfile: false,
      isWebhookEnabled: true,
      email: "lvtest@example.com",
      servicePreferencesSettings: {
        mode: "AUTO",
        version: 1,
      },
      lastAppVersion: "UNKNOWN",
      pushNotificationsContentType: "UNSET",
      reminderStatus: "ENABLED",
      id: "LVTEST00A00A196X-0000000000000000",
      version: 0,
      kind: "INewProfile",
    },
  },
];

const services = [
  {
    containerId: "services",
    document: {
      id: "01JR0QRJ8MX1PD06DE6X5FWXS5-0000000000000000",
      serviceId: "01JR0QRJ8MX1PD06DE6X5FWXS5",
      serviceName: "harness",
      authorizedRecipients: [],
      authorizedCIDRs: [],
      departmentName: "District Practical Rubber Bacon",
      isVisible: true,
      maxAllowedPaymentAmount: 8635,
      organizationFiscalCode: "38291048166",
      organizationName: "Wilkinson LLC",
      requireSecureChannels: false,
      version: 0,
      kind: "INewService",
    },
  },
];

const messages = [
  {
    containerId: "messages",
    document: {
      id: paymentFixtureMessageId,
      indexedId: paymentFixtureMessageId,
      fiscalCode: paymentFixtureFiscalCode,
      senderServiceId: paymentFixtureServiceId,
      senderUserId: "local",
      createdAt: "2025-05-31T10:00:00.000Z",
      featureLevelType: "STANDARD",
      isPending: false,
      timeToLiveSeconds: 3600,
    },
  },
  {
    containerId: "messages",
    document: {
      id: sendFixtureMessageId,
      indexedId: sendFixtureMessageId,
      fiscalCode: sendFixtureFiscalCode,
      senderServiceId: paymentFixtureServiceId,
      senderUserId: "local",
      createdAt: "2025-05-31T10:00:00.000Z",
      featureLevelType: "STANDARD",
      isPending: false,
      timeToLiveSeconds: 3600,
    },
  },
  {
    containerId: "messages",
    document: {
      id: genericFixtureMessageId,
      indexedId: genericFixtureMessageId,
      fiscalCode: sendFixtureFiscalCode,
      senderServiceId: genericFixtureServiceId,
      senderUserId: "local",
      createdAt: "2025-05-31T10:00:00.000Z",
      featureLevelType: "STANDARD",
      isPending: false,
      timeToLiveSeconds: 3600,
    },
  },
  {
    containerId: "messages",
    document: {
      id: lollipopFixtureMessageId,
      indexedId: lollipopFixtureMessageId,
      fiscalCode: sendFixtureFiscalCode,
      senderServiceId: genericFixtureServiceId,
      senderUserId: "local",
      createdAt: "2025-05-31T10:00:00.000Z",
      featureLevelType: "STANDARD",
      isPending: false,
      timeToLiveSeconds: 3600,
    },
  },
];

const messageStatuses = [
  {
    containerId: "message-status",
    document: {
      id: `${paymentFixtureMessageId}-0000000000000000`,
      fiscalCode: paymentFixtureFiscalCode,
      messageId: paymentFixtureMessageId,
      isArchived: false,
      isRead: false,
      status: "PROCESSED",
      updatedAt: "2025-05-31T10:00:00.000Z",
      version: 0,
    },
  },
  {
    containerId: "message-status",
    document: {
      id: `${sendFixtureMessageId}-0000000000000000`,
      fiscalCode: sendFixtureFiscalCode,
      messageId: sendFixtureMessageId,
      isArchived: false,
      isRead: false,
      status: "PROCESSED",
      updatedAt: "2025-05-31T10:00:00.000Z",
      version: 0,
    },
  },
  {
    containerId: "message-status",
    document: {
      id: `${genericFixtureMessageId}-0000000000000000`,
      fiscalCode: sendFixtureFiscalCode,
      messageId: genericFixtureMessageId,
      isArchived: false,
      isRead: false,
      status: "PROCESSED",
      updatedAt: "2025-05-31T10:00:00.000Z",
      version: 0,
    },
  },
  {
    containerId: "message-status",
    document: {
      id: `${lollipopFixtureMessageId}-0000000000000000`,
      fiscalCode: sendFixtureFiscalCode,
      messageId: lollipopFixtureMessageId,
      isArchived: false,
      isRead: false,
      status: "PROCESSED",
      updatedAt: "2025-05-31T10:00:00.000Z",
      version: 0,
    },
  },
];

const RCMessageConfigurations = [
  {
    containerId: "message-configuration",
    document: {
      configurationId: "01HMVMCDD3JFYTPKT4ZN4WQ73B",
      description: "A new RC Configuration fortesting purpose",
      disableLollipopFor: [],
      hasPrecondition: "NEVER",
      id: "01HMVMCDD3JFYTPKT4ZN4WQ73B",
      isLollipopEnabled: false,
      name: "Updated configuration",
      userId: "local",
    },
  },
  {
    containerId: "message-configuration",
    document: {
      configurationId: sendFixtureConfigurationId,
      description: "SEND Mockoon fixture configuration",
      disableLollipopFor: [],
      hasPrecondition: "NEVER",
      id: sendFixtureConfigurationId,
      isLollipopEnabled: false,
      name: "SEND Mockoon fixture",
      testEnvironment: {
        baseUrl: "http://localhost:8005/api/v1",
        detailsAuthentication: {
          headerKeyName: "x-api-key",
          key: "mock-api-key",
          type: "API_KEY",
        },
        testUsers: [sendFixtureFiscalCode],
      },
      userId: "local",
    },
  },
  {
    containerId: "message-configuration",
    document: {
      configurationId: genericFixtureConfigurationId,
      description: "Generic Remote Content Mockoon fixture configuration",
      disableLollipopFor: [],
      hasPrecondition: "NEVER",
      id: genericFixtureConfigurationId,
      isLollipopEnabled: false,
      name: "Generic Remote Content Mockoon fixture",
      testEnvironment: {
        baseUrl: "http://localhost:8007",
        detailsAuthentication: {
          headerKeyName: "x-api-key",
          key: "mock-api-key",
          type: "API_KEY",
        },
        testUsers: [sendFixtureFiscalCode],
      },
      userId: "local",
    },
  },
  {
    containerId: "message-configuration",
    document: {
      configurationId: lollipopFixtureConfigurationId,
      description: "Lollipop-enabled generic Remote Content fixture",
      disableLollipopFor: [],
      hasPrecondition: "NEVER",
      id: lollipopFixtureConfigurationId,
      isLollipopEnabled: true,
      name: "Lollipop-enabled generic Remote Content fixture",
      testEnvironment: {
        baseUrl: "http://localhost:8007",
        detailsAuthentication: {
          headerKeyName: "x-api-key",
          key: "mock-api-key",
          type: "API_KEY",
        },
        testUsers: [sendFixtureFiscalCode],
      },
      userId: "local",
    },
  },
];

const RCUserConfigurations = [
  {
    containerId: "user-configurations",
    document: {
      id: "01HMVMCDD3JFYTPKT4ZN4WQ73B",
      userId: "local",
    },
  },
  {
    containerId: "user-configurations",
    document: {
      id: sendFixtureConfigurationId,
      userId: "local",
    },
  },
  {
    containerId: "user-configurations",
    document: {
      id: genericFixtureConfigurationId,
      userId: "local",
    },
  },
  {
    containerId: "user-configurations",
    document: {
      id: lollipopFixtureConfigurationId,
      userId: "local",
    },
  },
];

// Fixtures to test GET /api/communication/v1/third-party-messages/{id}/precondition.
// Keep in sync with the blobs in setup-azurite-containers.js and the mocks in mockoon/.
// The fiscal code matches the `x-user` used in the Bruno collection (send-func-x-user).
const preconditionFiscalCode = "LVTEST00A00A199X";
const preconditionSendServiceId = "01JR0QRJ8MX1PD06DE6X5FWXS5"; // PN_SERVICE_ID
const preconditionGenericServiceId = "01JR0QRJ8MX1PD06DE6X5FWXS6";
const preconditionId = (prefix, n) => `${prefix}${String(n).padStart(20, "0")}`;

const preconditionRCConfigurations = [
  { n: 1, provider: "generic", lollipop: false },
  { n: 2, provider: "generic", lollipop: true },
  { n: 3, provider: "send", lollipop: false },
  { n: 4, provider: "send", lollipop: true },
].map(({ n, provider, lollipop }) => ({
  configurationId: preconditionId("01K8RC", n),
  description: `Precondition fixture: ${provider}, lollipop ${lollipop ? "enabled" : "disabled"}`,
  disableLollipopFor: [],
  hasPrecondition: "ALWAYS",
  id: preconditionId("01K8RC", n),
  isLollipopEnabled: lollipop,
  name: `precondition-${provider}-lollipop-${lollipop ? "on" : "off"}`,
  prodEnvironment: {
    baseUrl:
      provider === "send"
        ? "http://localhost:8005/api/v1"
        : "http://localhost:8011",
    detailsAuthentication: {
      headerKeyName: "X-Functions-Key",
      key: "dummy",
      type: "API_KEY",
    },
  },
  userId: "local",
}));

const preconditionMessages = [
  { n: 1, provider: "generic", cfg: 1, thirdPartyId: "generic-200" },
  { n: 2, provider: "generic", cfg: 2, thirdPartyId: "generic-200" },
  { n: 3, provider: "send", cfg: 3, thirdPartyId: "ABCD-EFGH-IJKL-123456-M-7" },
  { n: 4, provider: "send", cfg: 4, thirdPartyId: "ABCD-EFGH-IJKL-123456-M-7" },
].map((message) => ({
  ...message,
  id: preconditionId("01K8MS", message.n),
}));

RCMessageConfigurations.push(
  ...preconditionRCConfigurations.map((document) => ({
    containerId: "message-configuration",
    document,
  })),
);
RCUserConfigurations.push(
  ...preconditionRCConfigurations.map(({ configurationId }) => ({
    containerId: "user-configurations",
    document: { id: configurationId, userId: "local" },
  })),
);
messages.push(
  ...preconditionMessages.map(({ id, provider }) => ({
    containerId: "messages",
    document: {
      id,
      indexedId: id,
      fiscalCode: preconditionFiscalCode,
      senderServiceId:
        provider === "send"
          ? preconditionSendServiceId
          : preconditionGenericServiceId,
      senderUserId: "local",
      createdAt: "2026-10-13T10:00:00.000Z",
      featureLevelType: "STANDARD",
      isPending: false,
      timeToLiveSeconds: 604800,
    },
  })),
);
messageStatuses.push(
  ...preconditionMessages.map(({ id }) => ({
    containerId: "message-status",
    document: {
      id: `${id}-0000000000000000`,
      fiscalCode: preconditionFiscalCode,
      messageId: id,
      isArchived: false,
      isRead: false,
      status: "PROCESSED",
      updatedAt: "2026-10-13T10:00:00.000Z",
      version: 0,
    },
  })),
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForCosmos = async () => {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        console.log("Cosmos DB emulator is ready.");
        return;
      }
    } catch (_) {
      // Cosmos DB emulator is still starting up.
    }

    console.log(`Waiting for Cosmos DB emulator (${attempt}/60)...`);
    await sleep(1000);
  }

  throw new Error("Cosmos DB emulator did not become ready in time.");
};

const createContainerIfNotExists = async (database, { id, partitionKey }) => {
  try {
    await database.containers.createIfNotExists({
      id,
      partitionKey: { paths: [partitionKey] },
    });
    console.log(`Container ${id} with partition key ${partitionKey} ready.`);
  } catch (error) {
    console.error(`Error creating container ${id}:`, error);
    throw error;
  }
};

const addDocumentToContainer = async (database, containerId, document) => {
  try {
    await database.container(containerId).items.upsert(document, {
      disableAutomaticIdGeneration: true,
    });
    console.log(`Document ${document.id} ready in container ${containerId}.`);
  } catch (error) {
    console.error(`Error adding document to container ${containerId}:`, error);
    throw error;
  }
};

//messages containers creation
(async () => {
  await waitForCosmos();

  const { database } = await cosmosClient.databases.createIfNotExists({
    id: databaseId,
  });
  console.log(`Database ${databaseId} ready.`);

  await Promise.all(
    containers.map((container) =>
      createContainerIfNotExists(database, container),
    ),
  );

  await Promise.all(
    profiles.map(({ containerId, document }) =>
      addDocumentToContainer(database, containerId, document),
    ),
  );

  await Promise.all(
    services.map(({ containerId, document }) =>
      addDocumentToContainer(database, containerId, document),
    ),
  );

  await Promise.all(
    messages.map(({ containerId, document }) =>
      addDocumentToContainer(database, containerId, document),
    ),
  );

  await Promise.all(
    messageStatuses.map(({ containerId, document }) =>
      addDocumentToContainer(database, containerId, document),
    ),
  );
})();

//remote content containers creation
(async () => {
  await waitForCosmos();

  const { database } = await cosmosClient.databases.createIfNotExists({
    id: remoteContentDatabaseId,
  });
  console.log(`Database ${remoteContentDatabaseId} ready.`);

  await Promise.all(
    remoteContentContainers.map((container) =>
      createContainerIfNotExists(database, container),
    ),
  );

  await Promise.all(
    RCMessageConfigurations.map(({ containerId, document }) =>
      addDocumentToContainer(database, containerId, document),
    ),
  );

  await Promise.all(
    RCUserConfigurations.map(({ containerId, document }) =>
      addDocumentToContainer(database, containerId, document),
    ),
  );
})();
