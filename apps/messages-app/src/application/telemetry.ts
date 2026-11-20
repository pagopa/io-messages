import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import { ConflictError, TooManyRequestsError } from "@pagopa/hexagonal-core";

export const classifyWriteFailure = (error: unknown) =>
  error instanceof ConflictError
    ? "conflict"
    : error instanceof TooManyRequestsError
      ? "throttled"
      : "write_failed";

export const reportUpstreamFailure = (
  logger: Pick<Logger, "trackEvent"> | undefined,
  dependency: string,
  operation: string,
  reason:
    | "download_failed"
    | "http_error"
    | "invalid_response"
    | "no_response"
    | "throttled",
  upstreamStatus?: number,
) => {
  logger?.trackEvent({
    name: "MessagesApp.upstream.failed",
    properties: {
      dependency,
      operation,
      reason,
      ...(upstreamStatus === undefined ? {} : { upstreamStatus }),
    },
  });
};

export const reportUpstreamStatus = (
  logger: Pick<Logger, "trackEvent"> | undefined,
  dependency: string,
  operation: string,
  status: number,
) =>
  reportUpstreamFailure(
    logger,
    dependency,
    operation,
    status === 429 ? "throttled" : "http_error",
    status,
  );
