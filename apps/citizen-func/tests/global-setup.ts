import { CosmosClient } from "@azure/cosmos";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { createProbeMessageStatusDocument } from "./support/cloud-cosmos";
import { startSharedAzurite } from "./support/shared-testcontainers";

const readCosmosConnectionString = async (
  dotenvPath: string,
): Promise<string> => {
  const dotenv = await readFile(dotenvPath, "utf8");
  const line = dotenv
    .split(/\r?\n/)
    .find((currentLine) => currentLine.startsWith("COSMOSDB_CONNSTRING="));

  if (!line) {
    throw new Error(`COSMOSDB_CONNSTRING is missing from ${dotenvPath}`);
  }

  return line.slice("COSMOSDB_CONNSTRING=".length);
};

const extractCosmosEndpoint = (connectionString: string): string => {
  const endpoint = connectionString.match(/AccountEndpoint=([^;]+);/i)?.[1];

  if (!endpoint) {
    throw new Error("COSMOSDB_CONNSTRING has no AccountEndpoint");
  }

  return endpoint;
};

export default async function globalSetup() {
  const { azurite, container } = await startSharedAzurite();
  const stateDirectory = await mkdtemp(
    path.join(os.tmpdir(), "citizen-func-tests-"),
  );
  const statePath = path.join(stateDirectory, "harness.json");
  const connectionString = await readCosmosConnectionString(
    "/workspace/apps/citizen-func/.env.test",
  );
  const endpoint = extractCosmosEndpoint(connectionString);
  const runToken = randomUUID().slice(0, 8);
  const databaseName = `test-${runToken}-citizen-func-upsert-message-status`;
  const cosmosClient = new CosmosClient(connectionString);

  await cosmosClient.getDatabaseAccount();

  const { database } = await cosmosClient.databases.createIfNotExists({
    id: databaseName,
  });
  const { container: messageStatusContainer } =
    await database.containers.createIfNotExists({
      id: "message-status",
      partitionKey: {
        paths: ["/messageId"],
      },
    });

  const probeDocument = createProbeMessageStatusDocument(runToken);
  await messageStatusContainer.items.upsert(probeDocument);
  await messageStatusContainer
    .item(probeDocument.id, probeDocument.messageId)
    .delete();

  await writeFile(
    statePath,
    `${JSON.stringify(
      {
        azurite,
        cosmos: {
          databaseName,
          endpoint,
          messageStatusContainer: "message-status",
          partitionKey: "/messageId",
          runToken,
          source: "cloud",
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  process.env.CITIZEN_FUNC_TEST_STATE_PATH = statePath;
  process.env.CITIZEN_FUNC_TEST_COSMOS_CONNECTION_STRING = connectionString;

  return async () => {
    delete process.env.CITIZEN_FUNC_TEST_STATE_PATH;
    delete process.env.CITIZEN_FUNC_TEST_COSMOS_CONNECTION_STRING;

    try {
      await database.delete();
    } finally {
      await rm(stateDirectory, { force: true, recursive: true });
      await container.stop();
    }
  };
}
