import { MessageContent } from "../types/MessageContent";

export interface MessageContentRepository {
  getByMessageContentById(messageId: string): Promise<MessageContent>;
}
