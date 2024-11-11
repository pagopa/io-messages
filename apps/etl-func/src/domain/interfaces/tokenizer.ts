import { z } from "zod";

import { MessageMetadata, messageMetadataSchema } from "../message.js";

export interface TokenizerClient {
  tokenize(pii: string): Promise<string>;
}

const messageMetadataWithoutPIISchema = messageMetadataSchema
  .omit({ fiscalCode: true })
  .extend({
    recipientId: z.string().min(1),
  });

export type MessageMetaDataWithoutPII = z.infer<
  typeof messageMetadataWithoutPIISchema
>;

export const maskSensitiveInfo =
  (message: MessageMetadata) =>
  async (client: TokenizerClient): Promise<MessageMetaDataWithoutPII> => {
    const recipientId = await client.tokenize(message.fiscalCode);
    return { ...message, recipientId };
  };
