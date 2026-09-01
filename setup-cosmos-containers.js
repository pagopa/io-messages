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
  { id: "service-preferences", partitionKey: "/fiscalCode" },
  { id: "services", partitionKey: "/serviceId" },
  { id: "notifications", partitionKey: "/messageId" },
];

const remoteContentContainers = [
  { id: "message-configuration", partitionKey: "/configurationId" },
];

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
      lastAppVersion: "2.1.0.0",
      pushNotificationsContentType: "UNSET",
      reminderStatus: "ENABLED",
      id: "LVTEST00A00A200X-0000000000000001",
      version: 1,
      kind: "IRetrievedProfile",
      _etag: '"seed"',
      _rid: "seed",
      _self: "seed",
      _ts: 1,
    },
  },
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
      kind: "IRetrievedProfile",
      _etag: '"seed"',
      _rid: "seed",
      _self: "seed",
      _ts: 1,
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
      kind: "IRetrievedProfile",
      _etag: '"seed"',
      _rid: "seed",
      _self: "seed",
      _ts: 1,
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
      kind: "IRetrievedProfile",
      _etag: '"seed"',
      _rid: "seed",
      _self: "seed",
      _ts: 1,
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
      kind: "IRetrievedProfile",
      _etag: '"seed"',
      _rid: "seed",
      _self: "seed",
      _ts: 1,
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
      kind: "IRetrievedProfile",
      _etag: '"seed"',
      _rid: "seed",
      _self: "seed",
      _ts: 1,
    },
  },
];

const servicePreferences = [
  {
    containerId: "service-preferences",
    document: {
      accessReadMessageStatus: "ALLOW",
      fiscalCode: "LVTEST00A00A200X",
      id: "LVTEST00A00A200X-subscription-id-0000000000000001",
      isEmailEnabled: true,
      isInboxEnabled: true,
      isWebhookEnabled: true,
      kind: "IRetrievedServicePreference",
      serviceId: "subscription-id",
      settingsVersion: 1,
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
      kind: "IRetrievedService",
      _etag: '"seed"',
      _rid: "seed",
      _self: "seed",
      _ts: 1,
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
      _etag: '"seed"',
      _rid: "seed",
      _self: "seed",
      _ts: 1,
    },
  },
];

// maps containerId → partition key field path (used to derive the pk value for replace)
const containerPartitionKeyMap = Object.fromEntries(
  [...containers, ...remoteContentContainers].map(({ id, partitionKey }) => [
    id,
    partitionKey,
  ]),
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
    const container = database.container(containerId);
    // Use create + replace instead of upsert: the Linux CosmosDB emulator (vnext)
    // does not initialize _etag correctly on upsert-as-insert.
    const partitionKeyField = containerPartitionKeyMap[containerId].slice(1);
    const partitionKeyValue = document[partitionKeyField];
    try {
      await container.items.create(document);
    } catch (createError) {
      if (createError.code !== 409) throw createError;
      await container.item(document.id, partitionKeyValue).replace(document);
    }
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
    servicePreferences.map(({ containerId, document }) =>
      addDocumentToContainer(database, containerId, document),
    ),
  );

  await Promise.all(
    services.map(({ containerId, document }) =>
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
})();
