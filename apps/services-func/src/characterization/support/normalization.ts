const OMITTED_REQUEST_HEADERS = new Set([
  "accept",
  "connection",
  "content-length",
  "host",
]);

const OMITTED_RESPONSE_HEADERS = new Set([
  "connection",
  "content-length",
  "date",
  "keep-alive",
  "transfer-encoding",
  "x-powered-by",
]);

const REMOVED_METADATA_FIELDS = new Set(["_etag", "_rid", "_self", "_ts"]);
const TIMESTAMP_FIELDS = new Set(["createdAt", "created_at"]);
const ISO_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export interface NormalizationContext {
  readonly messageId?: string;
}

const normalizeString = (
  value: string,
  context: NormalizationContext,
  key?: string,
): string => {
  if (
    key !== undefined &&
    TIMESTAMP_FIELDS.has(key) &&
    ISO_UTC_TIMESTAMP.test(value)
  ) {
    return "__TIMESTAMP__";
  }

  if (context.messageId === undefined) {
    return value;
  }

  return value.split(context.messageId).join("__MESSAGE_ID__");
};

const normalizeHeaders = (
  headers: Record<string, string>,
  omittedHeaders: ReadonlySet<string>,
  context: NormalizationContext = {},
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers)
      .map(([key, value]) => [key.toLowerCase(), value] as const)
      .filter(([key, value]) => value.length > 0 && !omittedHeaders.has(key))
      .map(
        ([key, value]) => [key, normalizeString(value, context, key)] as const,
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  );

export const normalizeRequestHeaders = (
  headers: Record<string, string>,
): Record<string, string> => normalizeHeaders(headers, OMITTED_REQUEST_HEADERS);

export const normalizeResponseHeaders = (
  headers: Headers,
  context: NormalizationContext,
): Record<string, string> =>
  normalizeHeaders(
    Object.fromEntries(Array.from(headers.entries())),
    OMITTED_RESPONSE_HEADERS,
    context,
  );

export const normalizeObservedValue = (
  value: unknown,
  context: NormalizationContext,
  key?: string,
): unknown => {
  if (value instanceof Date) {
    return "__TIMESTAMP__";
  }

  if (Array.isArray(value)) {
    return value.map((nested) => normalizeObservedValue(nested, context, key));
  }

  if (typeof value === "string") {
    return normalizeString(value, context, key);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([field]) => !REMOVED_METADATA_FIELDS.has(field))
        .map(([field, nested]) => [
          field,
          normalizeObservedValue(nested, context, field),
        ]),
    );
  }

  return value;
};

export const createNormalizationLayer = (): Record<string, unknown> => ({
  normalizedPlaceholders: {
    __AZURITE_BLOB_ENDPOINT__: "dynamic Azurite blob endpoint",
    __AZURITE_QUEUE_ENDPOINT__: "dynamic Azurite queue endpoint",
    __COSMOS_ENDPOINT__: "dynamic Azure Cosmos DB emulator endpoint",
    __FUNCTIONS_HOST__: "dynamic local Azure Functions host endpoint",
    __MESSAGE_ID__: "runtime-generated message identifier",
    __NOTIFY_STUB__: "dynamic local notify stub endpoint",
    __TIMESTAMP__: "runtime-generated UTC timestamp",
  },
  omittedHeaders: [...OMITTED_RESPONSE_HEADERS].sort(),
  removedFields: [...REMOVED_METADATA_FIELDS].sort(),
});
