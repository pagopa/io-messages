import { mkdtemp, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { startSharedAzurite } from "./support/shared-testcontainers";

export default async function globalSetup() {
  const { azurite, container } = await startSharedAzurite();
  const stateDirectory = await mkdtemp(
    path.join(os.tmpdir(), "pushnotif-func-tests-"),
  );
  const statePath = path.join(stateDirectory, "harness.json");

  await writeFile(
    statePath,
    `${JSON.stringify({ azurite }, null, 2)}\n`,
    "utf8",
  );

  process.env.PUSHNOTIF_TEST_STATE_PATH = statePath;

  return async () => {
    delete process.env.PUSHNOTIF_TEST_STATE_PATH;
    await rm(stateDirectory, { force: true, recursive: true });
    await container.stop();
  };
}
