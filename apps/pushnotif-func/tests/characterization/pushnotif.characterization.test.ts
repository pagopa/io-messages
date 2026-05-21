import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  readScenarioCassette,
  writeScenarioCassette,
} from "../support/cassettes";
import { FunctionHost, createPushnotifHostEnv } from "../support/function-host";
import {
  normalizationDescription,
  normalizeValue,
} from "../support/normalization";

const isRecordMode = process.env.PUSHNOTIF_RECORD === "1";

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

describe.sequential("pushnotif-func characterization", () => {
  let host: FunctionHost;

  beforeAll(async () => {
    host = new FunctionHost(
      "/workspace/apps/pushnotif-func",
      createPushnotifHostEnv(),
    );
    await host.start();
  });

  afterAll(async () => {
    await host.stop();
  });

  test("records the invalid Notify payload contract", async () => {
    const request = {
      body: {},
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
      path: "/api/v1/notify",
    };

    const response = await fetch(`${host.baseUrl}${request.path}`, {
      body: JSON.stringify(request.body),
      headers: request.headers,
      method: request.method,
    });

    const responseBody = await response.json();

    await runCharacterization("notify-invalid-payload", {
      "normalization.json": normalizationDescription,
      "request.json": normalizeValue(request),
      "response.json": normalizeValue({
        body: responseBody,
        contentType: response.headers.get("content-type"),
        status: response.status,
      }),
      "side-effects.json": {},
      "topology.json": normalizeValue({
        baseUrl: host.baseUrl,
        boundary: "local Azure Functions host",
        dependencies: [
          "Testcontainers Azurite",
          "syntactic fake external config",
        ],
      }),
    });

    expect(response.status).toBe(400);
  });

  test("records the forbidden Notify scope contract", async () => {
    const request = {
      body: {
        fiscal_code: "AAABBB01C02D345D",
        message_id: "01J4QX8G17YY5QF8S9S5H7J4RN",
        notification_type: "MESSAGE",
      },
      headers: {
        "content-type": "application/json",
        "x-user-groups": "ApiMessageRead",
      },
      method: "POST",
      path: "/api/v1/notify",
    };

    const response = await fetch(`${host.baseUrl}${request.path}`, {
      body: JSON.stringify(request.body),
      headers: request.headers,
      method: request.method,
    });

    const responseBody = await response.json();

    await runCharacterization("notify-forbidden-scope", {
      "normalization.json": normalizationDescription,
      "request.json": normalizeValue(request),
      "response.json": normalizeValue({
        body: responseBody,
        contentType: response.headers.get("content-type"),
        status: response.status,
      }),
      "side-effects.json": {},
      "topology.json": normalizeValue({
        baseUrl: host.baseUrl,
        boundary: "local Azure Functions host",
        dependencies: [
          "Testcontainers Azurite",
          "syntactic fake external config",
        ],
      }),
    });

    expect(response.status).toBe(403);
  });

  test("records the degraded Health contract", async () => {
    const request = {
      headers: {},
      method: "GET",
      path: "/api/v1/health",
    };

    const response = await fetch(`${host.baseUrl}${request.path}`);
    const responseBody = await response.json();

    await runCharacterization("health-degraded", {
      "normalization.json": normalizationDescription,
      "request.json": normalizeValue(request),
      "response.json": normalizeValue({
        body: responseBody,
        contentType: response.headers.get("content-type"),
        status: response.status,
      }),
      "side-effects.json": {},
      "topology.json": normalizeValue({
        baseUrl: host.baseUrl,
        boundary: "local Azure Functions host",
        dependencies: [
          "Testcontainers Azurite",
          "fake Notification Hub hostnames",
        ],
      }),
    });

    expect(response.status).toBe(500);
  });
});
