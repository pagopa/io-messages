import { readHarnessState } from "./harness-state";

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const normalizeString = (value: string): string => {
  const {
    cosmos: { endpoint, runToken },
  } = readHarnessState();

  return collapseWhitespace(
    value
      .replace(/http:\/\/127\.0\.0\.1:\d+/g, "http://127.0.0.1:<PORT>")
      .replace(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g,
        "<ISO_TIMESTAMP>",
      )
      .replaceAll(endpoint, "<COSMOS_ENDPOINT>")
      .replaceAll(runToken, "<RUN_TOKEN>"),
  );
};

const omittedKeys = new Set(["_attachments", "_etag", "_rid", "_self", "_ts"]);

export const normalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value === "string") {
    return normalizeString(value);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !omittedKeys.has(key))
        .map(([key, nested]) => [key, normalizeValue(nested)]),
    );
  }

  return value;
};

export const normalizationDescription = {
  omittedFields: ["_attachments", "_etag", "_rid", "_self", "_ts"],
  removedResponseHeaders: ["date", "server", "transfer-encoding"],
  stringRules: [
    "Collapse repeated whitespace in serialized values",
    "Replace dynamic local Functions host ports with http://127.0.0.1:<PORT>",
    "Replace ISO timestamps with <ISO_TIMESTAMP>",
    "Replace the run-scoped token with <RUN_TOKEN>",
    "Replace the cloud Cosmos endpoint with <COSMOS_ENDPOINT>",
  ],
};
