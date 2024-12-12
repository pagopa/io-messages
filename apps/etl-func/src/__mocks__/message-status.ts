import { messageStatusSchema } from "@/domain/message-status.js";

export const aValidMessageStatus = messageStatusSchema.parse({
  fiscalCode: aFiscalCode,
  id: "01JD4YVX03H45HPGAB3E0Y2658-0000000000000000",
  isArchived: false,
  isRead: false,
  messageId: "01JD4YVX03H45HPGAB3E0Y2658",
  status: "ACCEPTED",
  updatedAt: 123,
  version: 0,
});
