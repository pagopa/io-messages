import { z } from "zod";

export const jwkPubKeyHashAlgorithmSchema = z.enum([
  "sha256",
  "sha384",
  "sha512",
]);
export type JwkPubKeyHashAlgorithm = z.infer<
  typeof jwkPubKeyHashAlgorithmSchema
>;
