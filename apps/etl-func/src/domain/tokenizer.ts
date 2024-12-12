export interface TokenizerClient {
  maskSensitiveInfo(pii: string): Promise<string>;
}
