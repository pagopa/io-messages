import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  readScenarioLayer,
  sortJson,
  writeScenarioCassette,
} from "./support/cassettes";
import { NotifyCharacterizationHarness } from "./support/harness";
import {
  CHARACTERIZATION_MODE,
  DEFAULT_REQUEST_HEADERS,
  NORMALIZATION_RULES,
  NOTIFY_ROUTE,
  SCENARIOS,
  ScenarioDefinition,
} from "./support/scenarios";

const DYNAMIC_RESPONSE_HEADERS = new Set(
  NORMALIZATION_RULES.responseHeadersRemoved,
);

const normalizeBody = async (response: Response): Promise<unknown> => {
  const rawBody = await response.text();

  if (rawBody.length === 0) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return sortJson(JSON.parse(rawBody));
  }

  return rawBody;
};

const normalizeHeaders = (
  headers: Headers,
  excludedHeaders: ReadonlySet<string>,
): Record<string, string> =>
  Object.fromEntries(
    [...headers.entries()]
      .filter(([key]) => !excludedHeaders.has(key.toLowerCase()))
      .sort(([left], [right]) => left.localeCompare(right)),
  );

const normalizeRequestHeaders = (
  scenario: ScenarioDefinition,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries({
      ...DEFAULT_REQUEST_HEADERS,
      ...scenario.headers,
    }).sort(([left], [right]) => left.localeCompare(right)),
  );

const harness = new NotifyCharacterizationHarness();
const [happyPathScenario, invalidPayloadScenario, wrongGroupScenario] =
  SCENARIOS;

const runScenario = async (scenario: ScenarioDefinition): Promise<void> => {
  const response = await fetch(new URL(NOTIFY_ROUTE, harness.baseUrl), {
    body: JSON.stringify(scenario.requestBody),
    headers: normalizeRequestHeaders(scenario),
    method: "POST",
  });

  const normalizedResponseBody = await normalizeBody(response);
  const layers = {
    "normalization.json": NORMALIZATION_RULES,
    "request.json": {
      body: sortJson(scenario.requestBody),
      headers: normalizeRequestHeaders(scenario),
      method: "POST",
      path: NOTIFY_ROUTE,
    },
    "response.json": {
      body: normalizedResponseBody,
      headers: normalizeHeaders(response.headers, DYNAMIC_RESPONSE_HEADERS),
      status: response.status,
    },
    "side-effects.json": {
      queueMessages: await harness.readQueueMessages(),
    },
    "topology.json": harness.topology(),
  };

  expect(response.status).toBe(scenario.expectedStatus);
  expect(
    (layers["side-effects.json"] as { queueMessages: unknown[] }).queueMessages,
  ).toHaveLength(scenario.expectedQueueMessages);

  if (CHARACTERIZATION_MODE === "record") {
    await writeScenarioCassette(scenario.name, layers);
    return;
  }

  await expect(
    readScenarioLayer(scenario.name, "request.json"),
  ).resolves.toEqual(sortJson(layers["request.json"]));
  await expect(
    readScenarioLayer(scenario.name, "response.json"),
  ).resolves.toEqual(sortJson(layers["response.json"]));
  await expect(
    readScenarioLayer(scenario.name, "side-effects.json"),
  ).resolves.toEqual(sortJson(layers["side-effects.json"]));
  await expect(
    readScenarioLayer(scenario.name, "topology.json"),
  ).resolves.toEqual(sortJson(layers["topology.json"]));
  await expect(
    readScenarioLayer(scenario.name, "normalization.json"),
  ).resolves.toEqual(sortJson(layers["normalization.json"]));
};

describe.sequential("Notify record-replay characterization", () => {
  beforeAll(async () => {
    await harness.start();
  });

  afterAll(async () => {
    await harness.stop();
  });

  beforeEach(async () => {
    await harness.reset();
  });

  it("notify-message-happy-path", async () => {
    expect.hasAssertions();
    await runScenario(happyPathScenario);
  });

  it("notify-invalid-payload", async () => {
    expect.hasAssertions();
    await runScenario(invalidPayloadScenario);
  });

  it("notify-message-wrong-user-group", async () => {
    expect.hasAssertions();
    await runScenario(wrongGroupScenario);
  });
});
