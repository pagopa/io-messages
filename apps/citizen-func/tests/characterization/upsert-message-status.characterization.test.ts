import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  readScenarioCassette,
  writeScenarioCassette,
} from "../support/cassettes";
import {
  readLatestMessageStatus,
  seedMessageStatus,
} from "../support/cloud-cosmos";
import {
  FunctionHost,
  createCitizenFuncHostEnv,
} from "../support/function-host";
import { readHarnessState } from "../support/harness-state";
import {
  normalizationDescription,
  normalizeValue,
} from "../support/normalization";

const fiscalCode = "AAABBB01C02D345D";
const isRecordMode = process.env.CITIZEN_FUNC_RECORD === "1";
const scenarioName = "upsert-message-status-reading-happy-path";

const runCharacterization = async (
  scenario: string,
  layers: Parameters<typeof writeScenarioCassette>[1],
) => {
  if (isRecordMode) {
    await writeScenarioCassette(scenario, layers);
    return;
  }

  await expect(readScenarioCassette(scenario)).resolves.toEqual(layers);
};

describe.sequential("citizen-func UpsertMessageStatus characterization", () => {
  let host: FunctionHost;

  beforeAll(async () => {
    host = new FunctionHost(
      "/workspace/apps/citizen-func",
      createCitizenFuncHostEnv(),
    );
    await host.start();
  });

  afterAll(async () => {
    await host.stop();
  });

  test("records the happy-path reading update contract", async () => {
    const harnessState = readHarnessState();
    const messageId = `message-${harnessState.cosmos.runToken}`;

    await seedMessageStatus({
      fiscalCode,
      messageId,
      status: "PROCESSED",
    });

    const request = {
      body: {
        change_type: "reading",
        is_read: true,
      },
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
      path: `/api/v1/messages/${fiscalCode}/${messageId}/message-status`,
    };

    const response = await fetch(host.createFunctionUrl(request.path), {
      body: JSON.stringify(request.body),
      headers: request.headers,
      method: request.method,
    });
    const responseBody = await response.json();
    const latestMessageStatus = await readLatestMessageStatus(messageId);

    expect(response.status).toBe(200);
    expect(responseBody).toMatchObject({
      is_archived: false,
      is_read: true,
      status: "PROCESSED",
      version: 1,
    });
    expect(latestMessageStatus).toMatchObject({
      fiscalCode,
      isArchived: false,
      isRead: true,
      messageId,
      status: "PROCESSED",
      version: 1,
    });

    await runCharacterization(scenarioName, {
      "normalization.json": normalizationDescription,
      "request.json": normalizeValue(request),
      "response.json": normalizeValue({
        body: responseBody,
        contentType: response.headers.get("content-type"),
        status: response.status,
      }),
      "side-effects.json": normalizeValue({
        latestMessageStatus,
      }),
      "topology.json": normalizeValue({
        baseUrl: host.baseUrl,
        boundary: "local Azure Functions host",
        cosmos: {
          databaseName: harnessState.cosmos.databaseName,
          endpoint: harnessState.cosmos.endpoint,
          messageStatusContainer: harnessState.cosmos.messageStatusContainer,
          source: harnessState.cosmos.source,
        },
        dependencies: [
          "cloud Cosmos DB via DefaultAzureCredential",
          "Testcontainers Azurite",
        ],
      }),
    });
  });
});
