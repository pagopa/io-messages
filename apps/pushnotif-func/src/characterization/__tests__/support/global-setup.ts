import { QueueClient } from "@azure/storage-queue";
import { GenericContainer, Wait } from "testcontainers";

import { NOTIFY_QUEUE_NAME } from "./scenarios";

const AZURITE_IMAGE =
  "mcr.microsoft.com/azure-storage/azurite:latest@sha256:647c63a91102a9d8e8000aab803436e1fc85fbb285e7ce830a82ee5d6661cf37";
const DEVSTORE_ACCOUNT_KEY =
  "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";
const DEVSTORE_ACCOUNT_NAME = "devstoreaccount1";

interface GlobalSetupProject {
  readonly provide: (key: string, value: string) => void;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const buildConnectionString = (
  host: string,
  blobPort: number,
  queuePort: number,
  tablePort: number,
): string =>
  [
    "DefaultEndpointsProtocol=http",
    `AccountName=${DEVSTORE_ACCOUNT_NAME}`,
    `AccountKey=${DEVSTORE_ACCOUNT_KEY}`,
    `BlobEndpoint=http://${host}:${blobPort}/${DEVSTORE_ACCOUNT_NAME}`,
    `QueueEndpoint=http://${host}:${queuePort}/${DEVSTORE_ACCOUNT_NAME}`,
    `TableEndpoint=http://${host}:${tablePort}/${DEVSTORE_ACCOUNT_NAME}`,
  ].join(";");

const waitForQueueReadiness = async (
  connectionString: string,
  queueName: string,
): Promise<void> => {
  const queueClient = new QueueClient(connectionString, queueName);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await queueClient.createIfNotExists();
      await queueClient.clearMessages();
      await queueClient.sendMessage(
        Buffer.from(JSON.stringify({ probe: true })).toString("base64"),
      );

      const { peekedMessageItems } = await queueClient.peekMessages({
        numberOfMessages: 1,
      });

      if (peekedMessageItems.length > 0) {
        await queueClient.clearMessages();
        return;
      }
    } catch {
      // Keep retrying until Azurite can serve the same queue path used by the suite.
    }

    await sleep(500);
  }

  throw new Error("Azurite queue readiness probe did not succeed in time.");
};

export default async function setup(project: GlobalSetupProject) {
  const container = await new GenericContainer(AZURITE_IMAGE)
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
    .withExposedPorts(10000, 10001, 10002)
    .withStartupTimeout(120000)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const connectionString = buildConnectionString(
    container.getHost(),
    container.getMappedPort(10000),
    container.getMappedPort(10001),
    container.getMappedPort(10002),
  );

  await waitForQueueReadiness(connectionString, NOTIFY_QUEUE_NAME);

  project.provide("characterizationAzuriteConnectionString", connectionString);
  project.provide("characterizationQueueName", NOTIFY_QUEUE_NAME);

  return async () => {
    await container.stop();
  };
}
