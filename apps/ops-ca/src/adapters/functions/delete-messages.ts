import { DeleteMessageUseCase } from "@/domain/use-cases/delete-message.js";
import { StorageBlobHandler } from "@azure/functions";

export const deleteMessages =
  (deleteMessageUseCase: DeleteMessageUseCase): StorageBlobHandler =>
  async (blob, context) => {
    if (!Buffer.isBuffer(blob)) {
      context.error("Invalid input blob file");
      return;
    }
    const lines = blob.toString("utf-8").trim().split("\n");
    await Promise.all(
      lines.map((line) => {
        const [fiscalCode, messageId] = line.split(",");
        return deleteMessageUseCase.execute(
          fiscalCode.trim(),
          messageId.trim(),
        );
      }),
    );
  };
