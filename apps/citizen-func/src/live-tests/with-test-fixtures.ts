import { test as baseTest, inject } from "vitest";

import type { SharedContainers } from "./global-setup";

import { deleteMessageStatusDocs, seedMessageStatus } from "./support/harness";

export interface MessageStatusRecord {
  fiscalCode: string;
  messageId: string;
  status: "PROCESSED";
}

const DEFAULT_FISCAL_CODE = "SPNDNL80R13C555X";
const SEEDED_MESSAGE_ID = "01J0APPROVALMESSAGESTATUS000001";
const MISSING_MESSAGE_ID = "01J0INTEGRATIONMESSAGESTATUS000002";

const buildMessageStatusRecord = (messageId: string): MessageStatusRecord => ({
  fiscalCode: DEFAULT_FISCAL_CODE,
  messageId,
  status: "PROCESSED",
});

const getSharedContainers = () =>
  inject("sharedContainers") as SharedContainers;

export const test = baseTest.extend<{
  messageStatusRecord: MessageStatusRecord;
  missingMessageStatusRecord: MessageStatusRecord;
  sharedContainers: SharedContainers;
}>({
  messageStatusRecord: async ({ sharedContainers }, use) => {
    const messageStatusRecord = buildMessageStatusRecord(SEEDED_MESSAGE_ID);

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
  missingMessageStatusRecord: async ({ sharedContainers }, use) => {
    const messageStatusRecord = buildMessageStatusRecord(MISSING_MESSAGE_ID);

    await deleteMessageStatusDocs(
      sharedContainers.cosmos,
      messageStatusRecord.messageId,
    );

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
