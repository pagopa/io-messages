import { DeleteMessageUseCase } from "@/domain/use-cases/delete-message.js";
import { StorageQueueHandler } from "@azure/functions";
import { z } from "zod";

export const deleteMessages =
  (deleteMessageUseCase: DeleteMessageUseCase): StorageQueueHandler =>
  async (input, context) => {
    try {
      context.log("\n\n");
      context.log(input);
      context.log("\n\n");
      const line = z.string().parse(input);
      const [fiscalCode, messageId] = line.split(",");

      return deleteMessageUseCase.execute(fiscalCode.trim(), messageId.trim());
    } catch (error) {
      if (error instanceof z.ZodError) {
        context.error(
          `Invalid pair [fiscalCode, messageId]: ${input}: ${error}`,
        );
        return;
      }
      context.error(
        `Something went wrong trying to delete the message ${input}: ${error}`,
      );
    }
  };
