import { Message, MessageMetadata } from "io-messages-common/domain/message";

export interface MessageRepository {
  getMessageByMetadata: (
    metadata: MessageMetadata,
  ) => Promise<Message | undefined>;
}
