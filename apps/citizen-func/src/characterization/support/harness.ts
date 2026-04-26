/**
 * Characterization-local seed/read helpers for Cosmos DB.
 *
 * Uses the raw @azure/cosmos SDK with characterization-local schemas only.
 * No production model classes or shared helpers are imported here.
 */
import { CosmosClient } from "@azure/cosmos";

// Well-known Cosmos DB Emulator master key (public, safe to commit).
export const COSMOS_EMULATOR_KEY =
  "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";

// Version padding matches CosmosdbModelVersioned.generateVersionedModelId
// (paddingLength = 16, version 0 → "0000000000000000").
const versionedId = (modelId: string, version: number): string => {
  const padded = ("0".repeat(16) + String(version)).slice(-16);
  return `${modelId}-${padded}`;
};

export interface SeedMessageStatusOptions {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseName: string;
  fiscalCode: string;
  messageId: string;
}

/** Raw Cosmos document shape expected by MessageStatusModel queries. */
interface MessageStatusDocument {
  fiscalCode: string;
  id: string;
  isArchived: boolean;
  isRead: boolean;
  kind: string;
  messageId: string;
  status: string;
  updatedAt: string;
  version: number;
}

const CONTAINER_NAME = "message-status";

const getContainer = (endpoint: string, key: string, databaseName: string) => {
  const client = new CosmosClient({ endpoint, key });
  return client.database(databaseName).container(CONTAINER_NAME);
};

export const seedMessageStatus = async (
  opts: SeedMessageStatusOptions,
): Promise<MessageStatusDocument> => {
  const container = getContainer(
    opts.cosmosEndpoint,
    opts.cosmosKey,
    opts.databaseName,
  );
  const doc: MessageStatusDocument = {
    fiscalCode: opts.fiscalCode,
    id: versionedId(opts.messageId, 0),
    isArchived: false,
    isRead: false,
    kind: "IRetrievedMessageStatus",
    messageId: opts.messageId,
    status: "PROCESSED",
    updatedAt: new Date().toISOString(),
    version: 0,
  };
  const { resource } = await container.items.create(doc);
  return resource as MessageStatusDocument;
};

export const readLatestMessageStatus = async (
  endpoint: string,
  key: string,
  databaseName: string,
  messageId: string,
): Promise<MessageStatusDocument | undefined> => {
  const container = getContainer(endpoint, key, databaseName);
  // Query for all versions of the messageId and return the latest.
  const { resources } = await container.items
    .query<MessageStatusDocument>({
      parameters: [{ name: "@messageId", value: messageId }],
      query:
        "SELECT * FROM c WHERE c.messageId = @messageId ORDER BY c.version DESC OFFSET 0 LIMIT 1",
    })
    .fetchAll();
  return resources[0];
};

export const deleteMessageStatusDocs = async (
  endpoint: string,
  key: string,
  databaseName: string,
  messageId: string,
): Promise<void> => {
  const container = getContainer(endpoint, key, databaseName);
  const { resources } = await container.items
    .query<{ id: string; messageId: string }>({
      parameters: [{ name: "@messageId", value: messageId }],
      query: "SELECT c.id, c.messageId FROM c WHERE c.messageId = @messageId",
    })
    .fetchAll();
  await Promise.allSettled(
    resources.map((r) => container.item(r.id, messageId).delete()),
  );
};
