export interface TokenizerClient {
  tokenize(pii: string): Promise<string>;
}

export const maskSensitiveInfo =
  (fiscalCode: string) =>
  async (client: TokenizerClient): Promise<string> =>
    await client.tokenize(fiscalCode);
