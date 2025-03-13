export interface MessageMetadataDeleter {
  deleteMessageMetadata: (partitionKey: string, id: string) => Promise<void>;
}
