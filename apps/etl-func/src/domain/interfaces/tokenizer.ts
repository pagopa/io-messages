export interface TokenizerClient {
  tokenize(fiscalCode: string): Promise<string>;
}

export const tokenize =
  (fiscalCode: string) =>
  (client: TokenizerClient): Promise<string> =>
    client.tokenize(fiscalCode);
