import { StorageBlobHandler, StorageQueueOutput } from "@azure/functions";

export const splitDeleteMessages =
  (queueOutput: StorageQueueOutput): StorageBlobHandler =>
  async (blob, context) => {
    if (!Buffer.isBuffer(blob)) {
      context.error("The input is not a buffer");
      return;
    }
    const lines = blob.toString("utf-8").trim().split("\n");

    const messages = [];

    for (let i = 0; i < lines.length; i++) {
      const [fiscalCode, messageId] = lines[i].split(",");
      if (!fiscalCode || !messageId) {
        context.error(`Unable to parse line ${i + 1}`);
        continue;
      }
      messages.push({ fiscalCode, messageId });
    }

    if (messages.length > 0) {
      context.extraOutputs.set(queueOutput, messages);
    }
  };
