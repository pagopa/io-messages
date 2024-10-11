import { MessageContent } from "../entities/message-content.js";

export interface MessageContentRepository {
  getMessageContentById: (name: string) => Promise<MessageContent>;
}
