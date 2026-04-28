import { MessageContent } from "../types/MessageContent";

export interface MessageContentRepository<StoreResponse = unknown> {
  /**
   * Returns the content of a message.
   *
   * Returns `null` if content not exists.
   * Throws an `Error` for any other failure.
   */
  getByMessageContentById(messageId: string): Promise<MessageContent | null>;

  /**
   * Stores the content of a message.
   *
   * Throws an `Error` if the content cannot be stored.
   */
  storeMessageContent(
    messageId: string,
    content: MessageContent,
  ): Promise<StoreResponse>;
}
