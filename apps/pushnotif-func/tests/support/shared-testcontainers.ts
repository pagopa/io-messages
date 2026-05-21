import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";

const azuriteImage =
  "mcr.microsoft.com/azure-storage/azurite:latest@sha256:647c63a91102a9d8e8000aab803436e1fc85fbb285e7ce830a82ee5d6661cf37";

export interface AzuriteHarnessState {
  blobPort: number;
  connectionString: string;
  host: string;
  queuePort: number;
  tablePort: number;
}

export interface SharedDependencies {
  azurite: AzuriteHarnessState;
  container: StartedTestContainer;
}

export const createAzuriteConnectionString = (
  host: string,
  blobPort: number,
  queuePort: number,
  tablePort: number,
) =>
  [
    "DefaultEndpointsProtocol=http",
    "AccountName=devstoreaccount1",
    "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==",
    `BlobEndpoint=http://${host}:${blobPort}/devstoreaccount1`,
    `QueueEndpoint=http://${host}:${queuePort}/devstoreaccount1`,
    `TableEndpoint=http://${host}:${tablePort}/devstoreaccount1`,
  ].join(";");

export const startSharedAzurite = async (): Promise<SharedDependencies> => {
  const container = await new GenericContainer(azuriteImage)
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

  const host = container.getHost();
  const blobPort = container.getMappedPort(10000);
  const queuePort = container.getMappedPort(10001);
  const tablePort = container.getMappedPort(10002);

  return {
    azurite: {
      blobPort,
      connectionString: createAzuriteConnectionString(
        host,
        blobPort,
        queuePort,
        tablePort,
      ),
      host,
      queuePort,
      tablePort,
    },
    container,
  };
};
