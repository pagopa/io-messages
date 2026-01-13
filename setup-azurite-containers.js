// this script creates the necessary containers, queues, and tables in the Azurite storage emulator

const { BlobServiceClient } = require("@azure/storage-blob");
const { QueueServiceClient } = require("@azure/storage-queue");
const { TableServiceClient } = require("@azure/data-tables");

const connectionString =
  "DefaultEndpointsProtocol=http;" +
  "AccountName=devstoreaccount1;" +
  "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;" +
  "BlobEndpoint=http://azurite:10000/devstoreaccount1;" +
  "QueueEndpoint=http://azurite:10001/devstoreaccount1;" +
  "TableEndpoint=http://azurite:10002/devstoreaccount1;";

const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString);
const queueServiceClient =
  QueueServiceClient.fromConnectionString(connectionString);
const tableServiceClient = TableServiceClient.fromConnectionString(
  connectionString,
  { allowInsecureConnection: true },
);

const containers = ["message-content", "processing-message"];
const queues = [
  "push-notifications",
  "notify-messages",
  "message-created",
  "message-created-poison",
  "message-processed",
  "notification-created",
  "webhook-notification",
  "processing-message",
];
const tables = ["MessagesDataplanIngestionErrors"];

const createContainerIfNotExists = async (name) => {
  try {
    const containerClient = blobServiceClient.getContainerClient(name);
    await containerClient.createIfNotExists();
    console.log(`Container ${name} created.`);
  } catch (error) {
    console.error(`Error creating container ${name}:`, error);
  }
};

const createQueueIfNotExists = async (name) => {
  try {
    const queueClient = queueServiceClient.getQueueClient(name);
    await queueClient.createIfNotExists();
    console.log(`Queue ${name} created.`);
  } catch (error) {
    console.error(`Error creating queue ${name}:`, error);
  }
};

const createTableIfNotExists = async (name) => {
  try {
    await tableServiceClient.createTable(name);
    console.log(`Table ${name} created.`);
  } catch (error) {
    if (error.statusCode === 409) {
      console.log(`Table ${name} already exists.`);
      return;
    }
    console.error(`Error creating table ${name}:`, error);
  }
};

(async () => {
  await Promise.all([
    ...containers.map(createContainerIfNotExists),
    ...queues.map(createQueueIfNotExists),
    ...tables.map(createTableIfNotExists),
  ]);
})();
