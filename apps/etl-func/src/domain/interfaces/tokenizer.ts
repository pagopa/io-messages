export interface TokenizerClient {
  tokenize(pii: string): Promise<string>;
}
export interface RecipientRepository {
  get(fiscalCode: string): Promise<string | undefined>;
  upsert(fiscalCode: string, recipientId: string): Promise<void>;
}
