import { CosmosClient } from "@azure/cosmos";

export const COSMOS_EMULATOR_KEY =
  "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";

const MESSAGE_STATUS_COLLECTION_NAME = "message-status";
const INITIAL_STATUS = "PROCESSED";
const INITIAL_UPDATED_AT = "2024-01-01T00:00:00.000Z";

export interface CosmosConnection {
  databaseName: string;
  endpoint: string;
  key: string;
}

export interface SeedMessageStatusInput {
  fiscalCode: string;
  messageId: string;
}

const createCosmosClient = ({ endpoint, key }: CosmosConnection) =>
  new CosmosClient({
    connectionPolicy: {
      enableEndpointDiscovery: false,
    },
    endpoint,
    key,
  });

const containerFor = (cosmos: CosmosConnection) =>
  createCosmosClient(cosmos)
    .database(cosmos.databaseName)
    .container(MESSAGE_STATUS_COLLECTION_NAME);

const generateVersionedModelId = (messageId: string, version: number) =>
  `${messageId}-${String(version).padStart(16, "0")}`;

const queryByMessageId = async (
  cosmos: CosmosConnection,
  messageId: string,
) => {
  const { resources } = await containerFor(cosmos)
    .items.query<Record<string, unknown>>(
      {
        parameters: [
          {
            name: "@messageId",
            value: messageId,
          },
        ],
        query: "SELECT * FROM c WHERE c.messageId = @messageId",
      },
      {
        partitionKey: messageId,
      },
    )
    .fetchAll();

  return resources.sort((left, right) => {
    const leftVersion = Number(left.version ?? 0);
    const rightVersion = Number(right.version ?? 0);

    return leftVersion - rightVersion;
  });
};

export const deleteMessageStatusDocs = async (
  cosmos: CosmosConnection,
  messageId: string,
) => {
  const documents = await queryByMessageId(cosmos, messageId);
  const container = containerFor(cosmos);

  await Promise.all(
    documents.map(async (document) => {
      const id = String(document.id);
      await container.item(id, messageId).delete();
    }),
  );
};

export const readLatestMessageStatus = async (
  cosmos: CosmosConnection,
  messageId: string,
) => {
  const documents = await queryByMessageId(cosmos, messageId);

  return documents.at(-1) ?? null;
};

export const seedMessageStatus = async (
  cosmos: CosmosConnection,
  input: SeedMessageStatusInput,
) => {
  const container = containerFor(cosmos);

  await container.items.create({
    fiscalCode: input.fiscalCode,
    id: generateVersionedModelId(input.messageId, 0),
    isArchived: false,
    isRead: false,
    messageId: input.messageId,
    status: INITIAL_STATUS,
    updatedAt: INITIAL_UPDATED_AT,
    version: 0,
  });
};
