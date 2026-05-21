const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const normalizeString = (value: string): string =>
  collapseWhitespace(
    value.replace(/http:\/\/127\.0\.0\.1:\d+/g, "http://127.0.0.1:<PORT>"),
  );

export const normalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value === "string") {
    return normalizeString(value);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        normalizeValue(nested),
      ]),
    );
  }

  return value;
};

export const normalizationDescription = {
  removedResponseHeaders: [
    "date",
    "request-context",
    "transfer-encoding",
    "server",
  ],
  stringRules: [
    "Collapse repeated whitespace in error messages",
    "Replace dynamic local Functions host ports with http://127.0.0.1:<PORT>",
  ],
};
