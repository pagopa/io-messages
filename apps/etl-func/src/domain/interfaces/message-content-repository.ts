import { MessageContent } from "../entities/message-content.js";

export interface MessageContentRepository {
  getMessageContentById: (messageId: string) => Promise<MessageContent>;
}
