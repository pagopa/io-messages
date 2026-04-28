import { test as baseTest, inject } from "vitest";

import type { SharedContainers } from "./global-setup";

import { deleteMessageStatusDocs, seedMessageStatus } from "./support/harness";

interface MessageStatusRecord {
  fiscalCode: string;
  messageId: string;
  status: "PROCESSED";
}

const getSharedContainers = () => inject("sharedContainers");

export const test = baseTest.extend<{
  messageStatusRecord: MessageStatusRecord;
  sharedContainers: SharedContainers;
}>({
  messageStatusRecord: async ({ sharedContainers }, use) => {
    const messageStatusRecord: MessageStatusRecord = {
      fiscalCode: "SPNDNL80R13C555X",
      messageId: "01J0APPROVALMESSAGESTATUS000001",
      status: "PROCESSED",
    };

    await deleteMessageStatusDocs(
      sharedContainers.cosmos,
      messageStatusRecord.messageId,
    );
    await seedMessageStatus(sharedContainers.cosmos, messageStatusRecord);

    try {
      await use(messageStatusRecord);
    } finally {
      await deleteMessageStatusDocs(
        sharedContainers.cosmos,
        messageStatusRecord.messageId,
      );
    }
  },
  sharedContainers: async ({ task }, use) => {
    void task;
    await use(getSharedContainers());
  },
});
