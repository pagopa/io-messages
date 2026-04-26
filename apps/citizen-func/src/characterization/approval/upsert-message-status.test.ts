/* eslint-disable no-console */
/**
 * Approval test: PUT /api/v1/messages/{fiscalCode}/{id}/message-status
 *
 * Drives the real local Azure Functions host through its HTTP boundary and
 * records or verifies multilayer cassettes. No handler code or shared runtime
 * packages are imported here.
 *
 * Run modes:
 *   record  – APPROVAL_MODE=record pnpm characterization:record
 *   verify  – APPROVAL_MODE=verify pnpm characterization:verify  (default)
 */
import { expect, inject } from "vitest";

import type { SharedContainers } from "../global-setup";

import {
  readScenarioLayer,
  scenarioCassetteExists,
  writeScenarioCassette,
} from "../support/cassettes";
import { readLatestMessageStatus } from "../support/harness";
import { test } from "../with-test-fixtures";

const SCENARIO = "upsert-message-status-happy-path";
const MODE = process.env.APPROVAL_MODE === "record" ? "record" : "verify";

const NORMALIZED_TIMESTAMP = "<NORMALIZED_TIMESTAMP>";

/** Strip volatile fields so cassettes remain stable across reruns. */
const normalizeResponse = (body: Record<string, unknown>) => ({
  ...body,
  updated_at: NORMALIZED_TIMESTAMP,
});

const normalizeDocument = (
  doc: Record<string, unknown>,
): Record<string, unknown> => {
  const { _etag, _rid, _self, _ts, id, updatedAt, ...rest } = doc as Record<
    string,
    unknown
  >;
  void _etag;
  void _rid;
  void _self;
  void _ts;
  void updatedAt;
  void id;
  return rest;
};

// ---------------------------------------------------------------------------

test(`PUT /v1/messages/{fiscalCode}/{id}/message-status – reading change (${MODE})`, async ({
  messageStatusRecord,
}) => {
  const { fiscalCode, messageId } = messageStatusRecord;
  const containers = inject("sharedContainers") as SharedContainers;

  const requestBody = { change_type: "reading", is_read: true };
  const path = `v1/messages/${fiscalCode}/${messageId}/message-status`;
  const url = new URL(path, containers.functionHost.baseUrl);

  // ── Drive the real local Functions host ──────────────────────────────────
  const response = await fetch(url.toString(), {
    body: JSON.stringify(requestBody),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });

  const responseBody = (await response.json()) as Record<string, unknown>;

  // ── Read side effect from Cosmos ─────────────────────────────────────────
  const updatedDoc = await readLatestMessageStatus(
    containers.cosmos.endpoint,
    containers.cosmos.key,
    containers.cosmos.databaseName,
    messageId,
  );

  if (!updatedDoc) {
    throw new Error(
      `No message status document found for messageId=${messageId} after upsert`,
    );
  }

  // ── Build normalised observations ────────────────────────────────────────
  const normalisedRequest = {
    body: requestBody,
    fiscalCode,
    messageId: "<SEED_MSG_ID>",
    method: "PUT",
    path: `v1/messages/${fiscalCode}/<SEED_MSG_ID>/message-status`,
  };

  const normalisedResponse = {
    body: normalizeResponse(responseBody),
    status: response.status,
  };

  const normalisedSideEffects = {
    messageStatus: normalizeDocument(
      updatedDoc as unknown as Record<string, unknown>,
    ),
  };

  const topology: Record<string, unknown> = {
    cosmosDbName: containers.cosmos.databaseName,
    cosmosEmulatorImage:
      "mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest",
    functionHostBaseUrl: "<NORMALIZED_PORT>",
    messageStatusContainer: "message-status",
    messageStatusPartitionKey: "/messageId",
  };

  const normalization = {
    rules: [
      "request.messageId replaced with <SEED_MSG_ID>",
      "response.body.updated_at replaced with <NORMALIZED_TIMESTAMP>",
      "side-effects: _etag, _rid, _self, _ts, updatedAt, id stripped",
      "topology.functionHostBaseUrl: dynamic port replaced with <NORMALIZED_PORT>",
    ],
  };

  // ── Record or verify ─────────────────────────────────────────────────────
  if (MODE === "record") {
    await writeScenarioCassette(SCENARIO, {
      "normalization.json": normalization,
      "request.json": normalisedRequest,
      "response.json": normalisedResponse,
      "side-effects.json": normalisedSideEffects,
      "topology.json": topology,
    });
    console.info(`[approval] cassettes written to cassettes/${SCENARIO}/`);
  } else {
    // Verify cassettes exist before comparing.
    const exists = await scenarioCassetteExists(SCENARIO, "response.json");
    if (!exists) {
      throw new Error(
        `Cassette not found for scenario "${SCENARIO}". ` +
          "Run record mode first: pnpm --filter citizen-func characterization:record",
      );
    }

    const expectedResponse = await readScenarioLayer(SCENARIO, "response.json");
    const expectedSideEffects = await readScenarioLayer(
      SCENARIO,
      "side-effects.json",
    );

    expect(normalisedResponse).toEqual(expectedResponse);
    expect(normalisedSideEffects).toEqual(expectedSideEffects);
  }

  // Always assert the live success shape regardless of mode.
  expect(response.status).toBe(200);
  expect(responseBody).toMatchObject({
    is_read: true,
    status: "PROCESSED",
  });
});
