import z from "zod";

import { messageContentSchema } from "./message-content.js";
import { messageStatusValueSchema } from "./message-status.js";
import { paymentStatusSchema } from "./payment-status.js";

export const readStatusSchema = z.enum(["READ", "UNREAD", "UNAVAILABLE"]);

export const serviceMessageSchema = z.object({
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

export type ServiceMessage = z.TypeOf<typeof serviceMessageSchema>;
