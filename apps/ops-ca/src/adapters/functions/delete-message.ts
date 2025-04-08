import { DeleteMessageUseCase } from "@/domain/use-cases/delete-message.js";
import { StorageQueueHandler } from "@azure/functions";
import { z } from "zod";

export const deleteMessages =
  (deleteMessageUseCase: DeleteMessageUseCase): StorageQueueHandler =>
  async (input, context) => {
    try {
      const { fiscalCode, messageId } = z
        .object({ fiscalCode: z.string().min(1), messageId: z.string().min(1) })
        .parse(input);

      await deleteMessageUseCase.execute(fiscalCode.trim(), messageId.trim());
    } catch (error) {
      if (error instanceof z.ZodError) {
        context.error(
          `Invalid pair [fiscalCode, messageId]: ${input}: ${error.message}`,
        );
        return;
      }

      context.error(
        `Something went wrong trying to delete the message ${input}: ${error}`,
      );
    }
  };
