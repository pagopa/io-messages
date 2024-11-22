import { RecipientIdNotFoundError } from "@/adapters/redis/recipient.js";

export interface TokenizerClient {
  tokenize(pii: string): Promise<string>;
}
export interface RecipientRepository {
  get(fiscalCode: string): Promise<null | string>;
  upsert(fiscalCode: string, recipientId: string): Promise<void>;
}

export interface TokenizerEnvironment {
  recipientRepository: RecipientRepository;
  tokenizerClient: TokenizerClient;
}

export const getCachedRecipientId =
  (fiscalCode: string) =>
  async ({
    recipientRepository: repo,
  }: TokenizerEnvironment): Promise<string> => {
    const recipientId = await repo.get(fiscalCode);
    if (!recipientId) {
      throw new RecipientIdNotFoundError();
    }
    return recipientId;
  };

export const tokenize =
  (fiscalCode: string) =>
  async ({ tokenizerClient: client }: TokenizerEnvironment): Promise<string> =>
    await client.tokenize(fiscalCode);
