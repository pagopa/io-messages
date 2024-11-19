import { Status, messageStatusSchema } from "@/domain/message-status.js";

export const createMessageStatusEntity = (status: unknown): Status => {
  try {
    return messageStatusSchema.parse(status);
  } catch (cause) {
    throw new Error("Error parsing the message status", { cause });
  }
};
