import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const cassetteRoot = path.join(__dirname, "..", "cassettes");

const cassetteFile = (scenario: string, fileName: string) =>
  path.join(cassetteRoot, scenario, fileName);

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

export const readScenarioLayer = async <T>(
  scenario: string,
  fileName: string,
): Promise<T> => {
  const content = await readFile(cassetteFile(scenario, fileName), "utf-8");
  return JSON.parse(content) as T;
};

export const scenarioCassetteExists = async (
  scenario: string,
  fileName = "response.json",
): Promise<boolean> => {
  try {
    await access(cassetteFile(scenario, fileName));
    return true;
  } catch {
    return false;
  }
};

export const writeScenarioCassette = async (
  scenario: string,
  layers: Record<string, unknown>,
) => {
  await Promise.all(
    Object.entries(layers).map(async ([fileName, payload]) => {
      const filePath = cassetteFile(scenario, fileName);

      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(
        filePath,
        `${JSON.stringify(sortJson(payload), null, 2)}\n`,
        "utf-8",
      );
    }),
  );
};
