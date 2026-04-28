import { expect } from "vitest";

import {
  readScenarioLayer,
  scenarioCassetteExists,
  writeScenarioCassette,
} from "../support/cassettes";
import { readLatestMessageStatus } from "../support/harness";
import { test } from "../with-test-fixtures";

const MODE = process.env.APPROVAL_MODE === "record" ? "record" : "verify";
const SCENARIO = "upsert-message-status-happy-path";

const normalizeResponseBody = (value: Record<string, unknown>) => ({
  ...value,
  updated_at: "<updated_at>",
});

const normalizeDocument = (value: Record<string, unknown>) => {
  const normalized = { ...value };

  delete normalized._attachments;
  delete normalized._etag;
  delete normalized._rid;
  delete normalized._self;
  delete normalized._ts;

  return {
    ...normalized,
    updatedAt: "<updated_at>",
  };
};

const topology = {
  dependencies: {
    azurite: {
      blobEndpoint: "http://<docker-host>:<azurite-blob-port>/devstoreaccount1",
      image:
        "mcr.microsoft.com/azure-storage/azurite:latest@sha256:647c63a91102a9d8e8000aab803436e1fc85fbb285e7ce830a82ee5d6661cf37",
      queueEndpoint:
        "http://<docker-host>:<azurite-queue-port>/devstoreaccount1",
      tableEndpoint:
        "http://<docker-host>:<azurite-table-port>/devstoreaccount1",
    },
    cosmos: {
      databaseName: "io-messages-approval",
      endpoint: "https://<docker-host>:<cosmos-port>/",
      image: "mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest",
      remoteContentDatabaseName: "remote-content-approval",
    },
  },
  disabledFunctions: [],
  runtime: {
    baseUrl: "http://127.0.0.1:<function-port>",
    boundary: "azure-functions-local-http",
  },
};

test(`PUT /v1/messages/{fiscalCode}/{id}/message-status happy path (${MODE})`, async ({
  messageStatusRecord,
  sharedContainers,
}) => {
  if (MODE === "verify") {
    expect(await scenarioCassetteExists(SCENARIO)).toBe(true);
  }

  const requestBody = {
    change_type: "reading",
    is_read: true,
  };

  const response = await fetch(
    `${sharedContainers.app.baseUrl}/api/v1/messages/${messageStatusRecord.fiscalCode}/${messageStatusRecord.messageId}/message-status`,
    {
      body: JSON.stringify(requestBody),
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );

  expect(response.status).toBe(200);

  const responseBody = (await response.json()) as Record<string, unknown>;

  expect(responseBody).toMatchObject({
    is_archived: false,
    is_read: true,
    status: messageStatusRecord.status,
    version: 1,
  });

  const updatedDoc = await readLatestMessageStatus(
    sharedContainers.cosmos,
    messageStatusRecord.messageId,
  );

  expect(updatedDoc).not.toBeNull();
  expect(updatedDoc).toMatchObject({
    fiscalCode: messageStatusRecord.fiscalCode,
    id: `${messageStatusRecord.messageId}-0000000000000001`,
    isArchived: false,
    isRead: true,
    messageId: messageStatusRecord.messageId,
    status: messageStatusRecord.status,
    version: 1,
  });

  const requestLayer = {
    body: requestBody,
    headers: {
      "content-type": "application/json",
    },
    method: "PUT",
    path: `/api/v1/messages/${messageStatusRecord.fiscalCode}/${messageStatusRecord.messageId}/message-status`,
  };
  const responseLayer = {
    body: normalizeResponseBody(responseBody),
    headers: {
      "content-type": response.headers.get("content-type"),
    },
    status: response.status,
  };
  const sideEffectsLayer = {
    messageStatus: normalizeDocument(updatedDoc as Record<string, unknown>),
  };

  if (MODE === "record") {
    await writeScenarioCassette(SCENARIO, {
      "request.json": requestLayer,
      "response.json": responseLayer,
      "side-effects.json": sideEffectsLayer,
      "topology.json": topology,
    });
    return;
  }

  expect(requestLayer).toEqual(
    await readScenarioLayer(SCENARIO, "request.json"),
  );
  expect(responseLayer).toEqual(
    await readScenarioLayer(SCENARIO, "response.json"),
  );
  expect(sideEffectsLayer).toEqual(
    await readScenarioLayer(SCENARIO, "side-effects.json"),
  );
  expect(topology).toEqual(await readScenarioLayer(SCENARIO, "topology.json"));
});
