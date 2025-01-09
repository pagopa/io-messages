import { messageStatusSchema } from "@/domain/message-status.js";

export const aFiscalCode = "RMLGNN97R06F158N";

export const aValidMessageStatus = messageStatusSchema.parse({
  fiscalCode: aFiscalCode,
  id: "01JD4YVX03H45HPGAB3E0Y2658-0000000000000000",
  isArchived: false,
  isRead: false,
  messageId: "01JD4YVX03H45HPGAB3E0Y2658",
  status: "ACCEPTED",
  updatedAt: "2019-11-25T15:03:12.684Z",
  version: 0,
});
