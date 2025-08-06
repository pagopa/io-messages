import { z } from "zod";

export const generateLcParamsPayloadSchema = z.object({
  operationId: z.string().min(1),
});

export type GenerateLcParamsPayload = z.TypeOf<
  typeof generateLcParamsPayloadSchema
>;
