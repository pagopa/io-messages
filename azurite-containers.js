const {
  BlobServiceClient,
  StorageSharedKeyCredential,
} = require("@azure/storage-blob");
const { QueueServiceClient } = require("@azure/storage-queue");

const connectionString =
  "DefaultEndpointsProtocol=http;" +
  "AccountName=devstoreaccount1;" +
  "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;" +
  "BlobEndpoint=http://azurite:10000/devstoreaccount1;" +
  "QueueEndpoint=http://azurite:10001/devstoreaccount1;";

const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString);

const queueServiceClient =
  QueueServiceClient.fromConnectionString(connectionString);

const containers = ["message-content"];
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

async function ensureContainers() {
  for (const name of containers) {
    const containerClient = blobServiceClient.getContainerClient(name);
    await containerClient.createIfNotExists();
  }
}

async function ensureQueues() {
  for (const name of queues) {
    const queueClient = queueServiceClient.getQueueClient(name);
    await queueClient.createIfNotExists();
  }
}

(async () => {
  await ensureContainers();
  await ensureQueues();
})();
