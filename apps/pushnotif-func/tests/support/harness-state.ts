import { readFileSync } from "node:fs";

import type { AzuriteHarnessState } from "./shared-testcontainers";

export interface SharedHarnessState {
  azurite: AzuriteHarnessState;
}

let cachedState: SharedHarnessState | undefined;

export const readHarnessState = (): SharedHarnessState => {
  if (cachedState) {
    return cachedState;
  }

  const statePath = process.env.PUSHNOTIF_TEST_STATE_PATH;

  if (!statePath) {
    throw new Error(
      "PUSHNOTIF_TEST_STATE_PATH is missing. Run the suite through the dedicated Vitest config.",
    );
  }

  cachedState = JSON.parse(
    readFileSync(statePath, "utf8"),
  ) as SharedHarnessState;

  return cachedState;
};
