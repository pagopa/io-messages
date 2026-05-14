import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const cassetteRoot = path.join(
  process.cwd(),
  "src/characterization/__tests__/cassettes",
);

export const sortJson = (value: unknown): unknown => {
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

const cassetteFile = (scenario: string, fileName: string) =>
  path.join(cassetteRoot, scenario, fileName);

export const readScenarioLayer = async (
  scenario: string,
  fileName: string,
): Promise<unknown> =>
  JSON.parse(await readFile(cassetteFile(scenario, fileName), "utf8"));

export const writeScenarioCassette = async (
  scenario: string,
  layers: Record<string, unknown>,
): Promise<void> => {
  await Promise.all(
    Object.entries(layers).map(async ([fileName, payload]) => {
      await mkdir(path.dirname(cassetteFile(scenario, fileName)), {
        recursive: true,
      });
      await writeFile(
        cassetteFile(scenario, fileName),
        `${JSON.stringify(sortJson(payload), null, 2)}\n`,
        "utf8",
      );
    }),
  );
};
