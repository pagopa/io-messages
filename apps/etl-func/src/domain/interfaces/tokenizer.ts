import { z } from "zod";

export interface TokenizerClient {
  maskSensitiveInfo(pii: string): Promise<string>;
}

const messageWithoutPIISchema = z.object({
  fiscalCode: z.string().uuid().min(1),
});

export type MessageWithoutPII = z.infer<typeof messageWithoutPIISchema>;

export const tokenize =
  (message: { fiscalCode: string }) =>
  async (client: TokenizerClient): Promise<MessageWithoutPII> => {
    const tokenizedFiscalCode = await client.maskSensitiveInfo(
      message.fiscalCode,
    );
    return { ...message, fiscalCode: tokenizedFiscalCode };
  };
