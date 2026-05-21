import { readFileSync } from "node:fs";

import type { AzuriteHarnessState } from "./shared-testcontainers";

export interface CloudCosmosHarnessState {
  databaseName: string;
  endpoint: string;
  messageStatusContainer: string;
  partitionKey: "/messageId";
  runToken: string;
  source: "cloud";
}

export interface SharedHarnessState {
  azurite: AzuriteHarnessState;
  cosmos: CloudCosmosHarnessState;
}

let cachedState: SharedHarnessState | undefined;

export const readHarnessState = (): SharedHarnessState => {
  if (cachedState) {
    return cachedState;
  }

  const statePath = process.env.CITIZEN_FUNC_TEST_STATE_PATH;

  if (!statePath) {
    throw new Error(
      "CITIZEN_FUNC_TEST_STATE_PATH is missing. Run the suite through the dedicated Vitest config.",
    );
  }

  cachedState = JSON.parse(
    readFileSync(statePath, "utf8"),
  ) as SharedHarnessState;

  return cachedState;
};
