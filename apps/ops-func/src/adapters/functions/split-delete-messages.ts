import { StorageBlobHandler, StorageQueueOutput } from "@azure/functions";

export const splitDeleteMessage =
  (queueOutput: StorageQueueOutput): StorageBlobHandler =>
  async (blob, context) => {
    if (!Buffer.isBuffer(blob)) {
      context.error("Invalid input blob file");
      return;
    }
    const lines = blob.toString("utf-8").trim().split("\n");

    const messages = lines.filter((line) => {
      const [fiscalCode, messageId] = line.split(",");

      // we don't want to stop the execution if a fiscalCode or messageId is not
      // defined so wqe just skip the line
      if (!fiscalCode || !messageId) {
        context.error(
          `Invalid pair fiscalCode: ${fiscalCode}, messageId: ${messageId}`,
        );
        return false;
      }
      return true;
    });

    const serializedMessages = messages.map((message) => ({
      fiscalCode: message.split(",")[0],
      messageId: message.split(",")[1],
    }));

    if (serializedMessages.length > 0)
      context.extraOutputs.set(queueOutput, serializedMessages);
  };
