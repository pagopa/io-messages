import { messageEventSchema } from "@/domain/message.js";

export const aSimpleMessageEvent = messageEventSchema.parse({
  content_type: "PAYMENT",
  feature_level_type: "STANDARD",
  has_attachments: false,
  has_precondition: false,
  has_remote_content: false,
  id: "01JB1YMTJ63TG2JHGAY9CMWY4A",
  op: "CREATE",
  payment_data_amount: 1,
  payment_data_invalid_after_due_date: false,
  payment_data_notice_number: "12",
  payment_data_payee_fiscal_code: "xcv",
  recipient_id: "recipientId",
  require_secure_channels: false,
  schema_version: 1,
  sender_service_id: "synthesizing",
  sender_user_id: "interface",
  subject: "subject",
  timestamp: 1720099471,
});
