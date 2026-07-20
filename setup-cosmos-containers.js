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
})();
