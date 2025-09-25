import { z } from "zod";

export const generateLcParamsPayloadSchema = z.object({
  operation_id: z.string().min(1),
});

export type GenerateLcParamsPayload = z.infer<
  typeof generateLcParamsPayloadSchema
>;
