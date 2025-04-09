import { StorageBlobHandler } from "@azure/functions";
import { QueueClient } from "@azure/storage-queue";

export const splitDeleteMessage =
  (queueClient: QueueClient): StorageBlobHandler =>
  async (blob, context) => {
    if (!Buffer.isBuffer(blob)) {
      context.error("Invalid input blob file");
      return;
    }
    const lines = blob.toString("utf-8").trim().split("\n");

    lines.forEach((line) => {
      const [fiscalCode, messageId] = line.split(",");

      if (!fiscalCode || !messageId) {
        context.error(
          `Invalid pair fiscalCode: ${fiscalCode}, messageId: ${messageId}`,
        );
        return;
      }

      return queueClient.sendMessage(
        Buffer.from(JSON.stringify({ fiscalCode, messageId })).toString(
          "base64",
        ),
      );
    });
  };
