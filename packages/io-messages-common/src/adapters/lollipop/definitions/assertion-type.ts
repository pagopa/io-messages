import { z } from "zod";

export const assertionTypeSchema = z.enum(["SAML", "OIDC"]);

export type AssertionType = z.infer<typeof assertionTypeSchema>;
