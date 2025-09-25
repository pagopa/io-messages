import { z } from "zod";

export const lollipopContentDigestSchema = z
  .string()
  .regex(
    /^(sha-256=:[A-Za-z0-9+/=]{44}:|sha-384=:[A-Za-z0-9+/=]{66}:|sha-512=:[A-Za-z0-9+/=]{88}:)$/,
    { message: "Invalid LollipopContentDigest format" },
  );

export type LollipopContentDigest = z.infer<typeof lollipopContentDigestSchema>;
