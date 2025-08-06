import { z } from "zod";

export const AssertionType = z.enum(["SAML", "OIDC"]);
