import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const cassetteRoot = fileURLToPath(
  new URL("../characterization/cassettes/", import.meta.url),
);

export interface ScenarioCassette {
  "normalization.json": unknown;
  "request.json": unknown;
  "response.json": unknown;
  "side-effects.json": unknown;
  "topology.json": unknown;
}

const scenarioFilePath = (scenario: string, fileName: keyof ScenarioCassette) =>
  path.join(cassetteRoot, scenario, fileName);

const sortJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortJson(nested)]),
    );
  }

  return value;
};

export const writeScenarioCassette = async (
  scenario: string,
  layers: ScenarioCassette,
): Promise<void> => {
  await Promise.all(
    Object.entries(layers).map(async ([fileName, payload]) => {
      await mkdir(
        path.dirname(
          scenarioFilePath(scenario, fileName as keyof ScenarioCassette),
        ),
        {
          recursive: true,
        },
      );

      await writeFile(
        scenarioFilePath(scenario, fileName as keyof ScenarioCassette),
        `${JSON.stringify(sortJson(payload), null, 2)}\n`,
        "utf8",
      );
    }),
  );
};

export const readScenarioCassette = async (
  scenario: string,
): Promise<ScenarioCassette> => ({
  "normalization.json": JSON.parse(
    await readFile(scenarioFilePath(scenario, "normalization.json"), "utf8"),
  ),
  "request.json": JSON.parse(
    await readFile(scenarioFilePath(scenario, "request.json"), "utf8"),
  ),
  "response.json": JSON.parse(
    await readFile(scenarioFilePath(scenario, "response.json"), "utf8"),
  ),
  "side-effects.json": JSON.parse(
    await readFile(scenarioFilePath(scenario, "side-effects.json"), "utf8"),
  ),
  "topology.json": JSON.parse(
    await readFile(scenarioFilePath(scenario, "topology.json"), "utf8"),
  ),
});
