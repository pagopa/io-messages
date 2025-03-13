export interface MessageContentDeleter {
  deleteMessageContent: (messageId: string) => Promise<void>;
}
