import { z } from "zod";

export interface TokenizerClient {
  tokenize(pii: string): Promise<string>;
}

const messageTokenizedSchema = z.object({
  fiscalCode: z.string().uuid().min(1),
});

export type MessageTokenized = z.infer<typeof messageTokenizedSchema>;

export const tokenize =
  (message: { fiscalCode: string }) =>
  async (client: TokenizerClient): Promise<MessageTokenized> => {
    const tokenizedFiscalCode = await client.tokenize(message.fiscalCode);
    return { ...message, fiscalCode: tokenizedFiscalCode };
  };
