import { FiscalCode } from "../message-status.js";

export interface TokenizerClient {
  tokenize(pii: string): Promise<string>;
}
export interface RecipientRepository {
  get(fiscalCode: FiscalCode): Promise<string | undefined>;
  upsert(fiscalCode: FiscalCode, recipientId: string): Promise<void>;
}
