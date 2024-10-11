import { PiiResource } from "@/infra/pdv-tokenizer/pii-resource.js";
import { TokenResource } from "@/infra/pdv-tokenizer/token-resource.js";

export interface TokenizerClient {
  tokenize(request: PiiResource): Promise<TokenResource>;
}

export const tokenize =
  (fiscalCode: string) =>
  (client: TokenizerClient): Promise<TokenResource> =>
    client.tokenize({ pii: fiscalCode });
