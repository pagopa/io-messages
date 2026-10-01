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
  "message-created-v2",
  "message-created-v2-poison",
  "message-created-poison",
  "message-processed",
  "notification-created",
  "notification-created-webhook",
  "notification-created-email",
  "processing-message",
  "update-installations-dispatch",
  "update-installations-dispatch-poison",
  "check-massive-job",
  "check-massive-job-poison",
  "process-massive-job",
  "proess-massive-job-poison",
  "payment-errors",
];
const tables = ["MessagesDataplanIngestionErrors"];

const paymentFixtureMessageId = "01M0YRTA395JBSZNWG7W63ZJDV";
const paymentMessageContents = [
  {
    blobName: `${paymentFixtureMessageId}.json`,
    containerName: "message-content",
    content: {
      subject: "Payment fixture message",
      markdown:
        "This is a local payment fixture message used to query a valid RPT ID during local development and Bruno testing.",
      payment_data: {
        amount: 100,
        invalid_after_due_date: false,
        notice_number: "312345678901234567",
        payee: {
          fiscal_code: "12345678901",
        },
      },
    },
  },
];

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

const uploadMessageContentIfNotExists = async ({
  blobName,
  containerName,
  content,
}) => {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.uploadData(Buffer.from(JSON.stringify(content)), {
      blobHTTPHeaders: { blobContentType: "application/json" },
    });
    console.log(`Blob ${blobName} ready in container ${containerName}.`);
  } catch (error) {
    console.error(`Error uploading blob ${blobName}:`, error);
  }
};

(async () => {
  await Promise.all([
    ...containers.map(createContainerIfNotExists),
    ...queues.map(createQueueIfNotExists),
    ...tables.map(createTableIfNotExists),
  ]);

  await Promise.all(
    paymentMessageContents.map(uploadMessageContentIfNotExists),
  );
})();
