// this script creates the necessary database and containers in the Cosmos DB emulator

const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOSDB_URI || "http://cosmos:8081";
const key =
  process.env.COSMOSDB_KEY ||
  "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";
const databaseId = process.env.COSMOSDB_NAME || "io-messages";
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
})();
