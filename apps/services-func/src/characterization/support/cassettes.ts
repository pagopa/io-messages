import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface ScenarioLayers {
  readonly normalization: unknown;
  readonly request: unknown;
  readonly response: unknown;
  readonly sideEffects: unknown;
  readonly topology: unknown;
}

const cassetteRoot = path.join(__dirname, "..", "cassettes", "create-message");

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

const cassetteFile = (scenario: string, fileName: string): string =>
  path.join(cassetteRoot, scenario, fileName);

const readJsonFile = async (
  scenario: string,
  fileName: string,
): Promise<unknown> =>
  JSON.parse(await readFile(cassetteFile(scenario, fileName), "utf8"));

const layerEntries = (layers: ScenarioLayers): readonly [string, unknown][] => [
  ["request.json", layers.request],
  ["response.json", layers.response],
  ["side-effects.json", layers.sideEffects],
  ["topology.json", layers.topology],
  ["normalization.json", layers.normalization],
];

export const writeScenarioCassette = async (
  scenario: string,
  layers: ScenarioLayers,
): Promise<void> => {
  await Promise.all(
    layerEntries(layers).map(async ([fileName, payload]) => {
      const target = cassetteFile(scenario, fileName);

      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(
        target,
        `${JSON.stringify(sortJson(payload), null, 2)}\n`,
        "utf8",
      );
    }),
  );
};

export const readScenarioCassette = async (
  scenario: string,
): Promise<ScenarioLayers> => {
  const [request, response, sideEffects, topology, normalization] =
    await Promise.all([
      readJsonFile(scenario, "request.json"),
      readJsonFile(scenario, "response.json"),
      readJsonFile(scenario, "side-effects.json"),
      readJsonFile(scenario, "topology.json"),
      readJsonFile(scenario, "normalization.json"),
    ]);

  return {
    normalization,
    request,
    response,
    sideEffects,
    topology,
  };
};
