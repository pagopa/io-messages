import { expect } from "vitest";

import { readLatestMessageStatus } from "../live-tests/support/harness";
import { test } from "../live-tests/with-test-fixtures";

const READING_CHANGE = {
  change_type: "reading",
  is_read: true,
} as const;

const assertProblemJsonResponse = async (
  response: Response,
  expected: {
    detail: string;
    status: number;
    title: string;
  },
) => {
  expect(response.headers.get("content-type")).toContain(
    "application/problem+json",
  );
  await expect(response.json()).resolves.toMatchObject({
    detail: expected.detail,
    status: expected.status,
    title: expected.title,
  });
};

test("PUT /v1/messages/{fiscalCode}/{id}/message-status updates an existing message status", async ({
  messageStatusRecord,
  sharedContainers,
}) => {
  const response = await fetch(
    `${sharedContainers.app.baseUrl}/api/v1/messages/${messageStatusRecord.fiscalCode}/${messageStatusRecord.messageId}/message-status`,
    {
      body: JSON.stringify(READING_CHANGE),
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");

  await expect(response.json()).resolves.toMatchObject({
    is_archived: false,
    is_read: true,
    status: messageStatusRecord.status,
    updated_at: expect.any(String),
    version: 1,
  });

  await expect(
    readLatestMessageStatus(
      sharedContainers.cosmos,
      messageStatusRecord.messageId,
    ),
  ).resolves.toMatchObject({
    fiscalCode: messageStatusRecord.fiscalCode,
    id: `${messageStatusRecord.messageId}-0000000000000001`,
    isArchived: false,
    isRead: true,
    messageId: messageStatusRecord.messageId,
    status: messageStatusRecord.status,
    updatedAt: expect.any(String),
    version: 1,
  });
});

test("PUT /v1/messages/{fiscalCode}/{id}/message-status returns 404 when the message status does not exist", async ({
  missingMessageStatusRecord,
  sharedContainers,
}) => {
  const response = await fetch(
    `${sharedContainers.app.baseUrl}/api/v1/messages/${missingMessageStatusRecord.fiscalCode}/${missingMessageStatusRecord.messageId}/message-status`,
    {
      body: JSON.stringify(READING_CHANGE),
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );

  expect(response.status).toBe(404);
  await assertProblemJsonResponse(response, {
    detail: `Cannot found message status for message ${missingMessageStatusRecord.messageId}`,
    status: 404,
    title: "Cannot found message status",
  });

  await expect(
    readLatestMessageStatus(
      sharedContainers.cosmos,
      missingMessageStatusRecord.messageId,
    ),
  ).resolves.toBeNull();
});

test("PUT /v1/messages/{fiscalCode}/{id}/message-status returns 403 when the fiscal code does not own the message status", async ({
  messageStatusRecord,
  sharedContainers,
}) => {
  const response = await fetch(
    `${sharedContainers.app.baseUrl}/api/v1/messages/AAAAAA00A00A000A/${messageStatusRecord.messageId}/message-status`,
    {
      body: JSON.stringify(READING_CHANGE),
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );

  expect(response.status).toBe(403);
  await assertProblemJsonResponse(response, {
    detail:
      "You do not have enough permission to complete the operation you requested",
    status: 403,
    title: "You are not allowed here",
  });

  await expect(
    readLatestMessageStatus(
      sharedContainers.cosmos,
      messageStatusRecord.messageId,
    ),
  ).resolves.toMatchObject({
    fiscalCode: messageStatusRecord.fiscalCode,
    id: `${messageStatusRecord.messageId}-0000000000000000`,
    isArchived: false,
    isRead: false,
    messageId: messageStatusRecord.messageId,
    status: messageStatusRecord.status,
    version: 0,
  });
});
