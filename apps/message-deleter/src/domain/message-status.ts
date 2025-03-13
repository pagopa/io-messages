export interface MessageStatusDeleter {
  deleteMessageStatuses: (partitionKey: string) => Promise<void>;
}
