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

export type MessageMetadataWithoutPII = z.infer<
  typeof messageMetadataWithoutPIISchema
>;

export const maskSensitiveInfo =
  (message: MessageMetadata) =>
  async (client: TokenizerClient): Promise<MessageMetadataWithoutPII> => {
    const recipientId = await client.tokenize(message.fiscalCode);
    return messageMetadataWithoutPIISchema.parse({
      ...message,
      recipientId,
    });
  };
