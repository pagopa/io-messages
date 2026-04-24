import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  readScenarioCassette,
  writeScenarioCassette,
} from "./support/cassettes";
import {
  CreateMessageCharacterizationHarness,
  type ScenarioDefinition,
  createHappyPathBody,
  createStandardHeaders,
  getAuthorizedFiscalCode,
  getVerifyMode,
} from "./support/harness";

const UNAUTHORIZED_FISCAL_CODE = "AAABBB01C02D345W";

const scenarios: readonly ScenarioDefinition[] = [
  {
    expectSideEffects: true,
    expectedStatus: 201,
    name: "happy-path",
    request: {
      body: createHappyPathBody(),
      headers: createStandardHeaders(["ApiMessageWrite"]),
      method: "POST",
      path: `/v1/messages/${getAuthorizedFiscalCode()}`,
    },
  },
  {
    expectSideEffects: false,
    expectedStatus: 400,
    name: "missing-fiscal-code",
    request: {
      body: createHappyPathBody(),
      headers: createStandardHeaders(["ApiMessageWrite"]),
      method: "POST",
      path: "/v1/messages",
    },
  },
  {
    expectSideEffects: false,
    expectedStatus: 403,
    name: "unauthorized-recipient",
    request: {
      body: createHappyPathBody(),
      headers: createStandardHeaders(["ApiLimitedMessageWrite"]),
      method: "POST",
      path: `/v1/messages/${UNAUTHORIZED_FISCAL_CODE}`,
    },
  },
];

describe.sequential("CreateMessage characterization", () => {
  let harness: CreateMessageCharacterizationHarness | undefined;

  beforeAll(async () => {
    harness = await CreateMessageCharacterizationHarness.start();
  }, 120_000);

  afterAll(async () => {
    await harness?.stop();
  }, 60_000);

  for (const scenario of scenarios) {
    it(
      scenario.name,
      async () => {
        if (harness === undefined) {
          throw new Error("Characterization harness was not initialized.");
        }

        const liveLayers = await harness.runScenario(scenario);

        if (getVerifyMode() === "record") {
          await writeScenarioCassette(scenario.name, liveLayers);
          return;
        }

        expect(liveLayers).toEqual(await readScenarioCassette(scenario.name));
      },
      120_000,
    );
  }
});
