export type CharacterizationMode = "record" | "verify";

const parseMode = (
  candidate: string | undefined,
): CharacterizationMode | undefined =>
  candidate === "record" || candidate === "verify" ? candidate : undefined;

export const CHARACTERIZATION_MODE =
  parseMode(process.env.CHARACTERIZATION_MODE) ?? "verify";

export const NOTIFY_ROUTE = "/api/v1/notify";
export const READY_ROUTE = "/readyz";
export const NOTIFY_QUEUE_NAME = "push-notifications";

export const DEFAULT_REQUEST_HEADERS = {
  "content-type": "application/json",
} as const;

export const ALLOWED_MESSAGE_GROUP = "ApiNewMessageNotify";
export const WRONG_MESSAGE_GROUP = "ApiMessageRead";

export interface ScenarioDefinition {
  readonly expectedQueueMessages: number;
  readonly expectedStatus: number;
  readonly headers?: Record<string, string>;
  readonly name:
    | "notify-invalid-payload"
    | "notify-message-happy-path"
    | "notify-message-wrong-user-group";
  readonly requestBody: Record<string, unknown>;
}

const validMessageRequest = {
  fiscal_code: "AAABBB01C02D345D",
  message_id: "aMessageId",
  notification_type: "MESSAGE",
} as const;

export const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    expectedQueueMessages: 1,
    expectedStatus: 204,
    headers: {
      "x-user-groups": ALLOWED_MESSAGE_GROUP,
    },
    name: "notify-message-happy-path",
    requestBody: validMessageRequest,
  },
  {
    expectedQueueMessages: 0,
    expectedStatus: 400,
    name: "notify-invalid-payload",
    requestBody: {},
  },
  {
    expectedQueueMessages: 0,
    expectedStatus: 403,
    headers: {
      "x-user-groups": WRONG_MESSAGE_GROUP,
    },
    name: "notify-message-wrong-user-group",
    requestBody: validMessageRequest,
  },
] as const;

export const NORMALIZATION_RULES = {
  queueMessages:
    "Queue payloads are parsed from either plain JSON or base64 JSON.",
  requestHeaders: ["content-type", "x-user-groups"],
  responseHeadersRemoved: [
    "connection",
    "content-length",
    "date",
    "keep-alive",
    "transfer-encoding",
  ],
  runtimeBaseUrl:
    "Runtime base URL is normalized to http://127.0.0.1:<runtime-port>.",
} as const;

export const FULL_HOST_FALLBACK_REASON =
  "The full pushnotif-func host boot is not part of this suite because the app wires Cosmos clients through DefaultAzureCredential and the repository does not ship a credible local Cosmos+Aad topology for Notify.";
