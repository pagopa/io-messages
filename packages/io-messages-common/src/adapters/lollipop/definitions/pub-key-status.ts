import { z } from "zod";

export const pubKeyStatusSchema = z.enum(["PENDING", "VALID", "REVOKED"]);

export type PubKeyStatus = z.infer<typeof pubKeyStatusSchema>;
