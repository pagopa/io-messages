/**
 * Per-test disposable fixtures for the citizen-func characterization suite.
 *
 * Uses Vitest's builder-pattern `test.extend` with `use` callbacks so each
 * test gets fresh, isolated data that is removed automatically after the test
 * completes. The shared Cosmos container and Functions host stay alive for the
 * whole run (owned by global-setup.ts).
 */
import { randomUUID } from "node:crypto";
import { test as baseTest, inject } from "vitest";

import type { SharedContainers } from "./global-setup";

import { deleteMessageStatusDocs, seedMessageStatus } from "./support/harness";

export interface MessageStatusFixture {
  fiscalCode: string;
  messageId: string;
}

export const test = baseTest.extend<{
  messageStatusRecord: MessageStatusFixture;
}>({
  // eslint-disable-next-line no-empty-pattern
  messageStatusRecord: async ({}, use) => {
    const containers = inject("sharedContainers") as SharedContainers;

    const testId = randomUUID();
    const messageId = `char-${testId}`;
    const fiscalCode = "SPNDNL80A13Y555X";

    await seedMessageStatus({
      cosmosEndpoint: containers.cosmos.endpoint,
      cosmosKey: containers.cosmos.key,
      databaseName: containers.cosmos.databaseName,
      fiscalCode,
      messageId,
    });

    await use({ fiscalCode, messageId });

    await deleteMessageStatusDocs(
      containers.cosmos.endpoint,
      containers.cosmos.key,
      containers.cosmos.databaseName,
      messageId,
    );
  },
});
