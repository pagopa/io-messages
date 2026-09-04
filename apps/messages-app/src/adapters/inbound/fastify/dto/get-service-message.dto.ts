import z from "zod";

import { messageContentSchema } from "../../../../application/ports/message-content.js";
import { messageStatusValueSchema } from "../../../../application/ports/message-status.js";
import { paymentStatusSchema } from "../../../../application/ports/payment-status.js";
import {
  ServiceMessage,
  readStatusSchema,
} from "../../../../application/ports/service-message.js";

export const GetServiceMessageResponseSchema = z.object({
  message: z.object({
    content: messageContentSchema.optional(),
    created_at: z.string(),
    feature_level_type: z.enum(["ADVANCED", "STANDARD"]),
    fiscal_code: z.string(),
    id: z.string(),
    sender_service_id: z.string().min(1),
    time_to_live: z.number().optional(),
  }),
  payment_status: paymentStatusSchema.optional(),
  read_status: readStatusSchema.optional(),
  status: messageStatusValueSchema,
});

export type GetServiceMessageResponse = z.infer<
  typeof GetServiceMessageResponseSchema
>;

export const toGetServiceMessageResponse = (
  output: ServiceMessage,
): GetServiceMessageResponse => output;
