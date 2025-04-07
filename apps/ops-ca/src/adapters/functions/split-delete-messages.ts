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
      context.log("Pushing line", line);
      return queueClient.sendMessage(line);
    });
  };
