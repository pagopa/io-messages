import { CosmosClient } from "@azure/cosmos";

import { readHarnessState } from "./harness-state";

const versionPaddingLength = 16;

export const generateVersionedModelId = (
  modelId: string,
  version: number,
): string =>
  `${modelId}-${("0".repeat(versionPaddingLength) + String(version)).slice(
    -versionPaddingLength,
  )}`;

const createCloudCosmosClient = (): CosmosClient => {
  const connectionString =
    process.env.CITIZEN_FUNC_TEST_COSMOS_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error(
      "CITIZEN_FUNC_TEST_COSMOS_CONNECTION_STRING is missing. Run the suite through the dedicated Vitest config.",
    );
  }

  return new CosmosClient(connectionString);
};

const getMessageStatusContainer = () => {
  const {
    cosmos: { databaseName, messageStatusContainer },
  } = readHarnessState();

  return createCloudCosmosClient()
    .database(databaseName)
    .container(messageStatusContainer);
};

export const createProbeMessageStatusDocument = (runToken: string) => {
  const messageId = `probe-${runToken}`;

  return {
    fiscalCode: "AAABBB01C02D345D",
    id: generateVersionedModelId(messageId, 0),
    isArchived: false,
    isRead: false,
    kind: "IRetrievedMessageStatus" as const,
    messageId,
    status: "PROCESSED",
    updatedAt: "2024-01-01T00:00:00.000Z",
    version: 0,
  };
};

export const seedMessageStatus = async (params: {
  fiscalCode: string;
  messageId: string;
  status: string;
}): Promise<void> => {
  await getMessageStatusContainer().items.create({
    fiscalCode: params.fiscalCode,
    id: generateVersionedModelId(params.messageId, 0),
    isArchived: false,
    isRead: false,
    kind: "IRetrievedMessageStatus",
    messageId: params.messageId,
    status: params.status,
    updatedAt: "2024-01-01T00:00:00.000Z",
    version: 0,
  });
};

const stripCosmosMetadata = (
  document: Record<string, unknown>,
): Record<string, unknown> => {
  const stableDocument = { ...document };

  delete stableDocument._attachments;
  delete stableDocument._etag;
  delete stableDocument._rid;
  delete stableDocument._self;
  delete stableDocument._ts;

  return stableDocument;
};

export const readLatestMessageStatus = async (
  messageId: string,
): Promise<Record<string, unknown>> => {
  const queryResult = await getMessageStatusContainer()
    .items.query(
      {
        parameters: [
          {
            name: "@messageId",
            value: messageId,
          },
        ],
        query:
          "SELECT TOP 1 * FROM c WHERE c.messageId = @messageId ORDER BY c.version DESC",
      },
      {
        partitionKey: messageId,
      },
    )
    .fetchAll();

  const latestDocument = queryResult.resources[0] as
    | Record<string, unknown>
    | undefined;

  if (!latestDocument) {
    throw new Error(`No message status found for ${messageId}`);
  }

  return stripCosmosMetadata(latestDocument);
};
