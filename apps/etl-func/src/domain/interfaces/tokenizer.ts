export interface TokenizerClient {
  tokenize(pii: string): Promise<string>;
}
