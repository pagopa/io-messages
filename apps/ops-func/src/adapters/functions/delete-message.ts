import { DeleteMessageUseCase } from "@/domain/use-cases/delete-message.js";
import { StorageQueueHandler } from "@azure/functions";
import { z } from "zod";

const payloadSchema = z.object({
  fiscalCode: z.string().nonempty().trim(),
  messageId: z.string().nonempty().trim(),
});

export const deleteMessages =
  (deleteMessage: DeleteMessageUseCase): StorageQueueHandler =>
  async (input, context) => {
    const result = payloadSchema.safeParse(input);
    if (!result.success) {
      context.error("Invalid payload");
      return;
    }
    const payload = result.data;
    try {
      await deleteMessage.execute(payload.fiscalCode, payload.messageId);
    } catch (e) {
      const detail = e instanceof Error ? e.message : undefined;
      context.error(`Unable to delete message`, payload.messageId, detail);
    }
  };
