export interface MessageRepository {
  // Here we are not using branded types because we want to be able to delete
  // messages with malformed fiscal code or message id
  deleteMessage(fiscalCode: string, messageId: string): Promise<void>;
}
