export interface TokenizerClient {
  tokenize(fiscalCode: string): Promise<string>;
}

export const tokenize =
  (message: { fiscalCode: string }) =>
  async (client: TokenizerClient): Promise<{ fiscalCode: string }> => {
    const tokenizedFiscalCode = await client.tokenize(message.fiscalCode);
    return { ...message, fiscalCode: tokenizedFiscalCode };
  };
