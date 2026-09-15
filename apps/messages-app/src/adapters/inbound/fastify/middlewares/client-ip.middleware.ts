import type {
  EmptyHttpMiddlewareContext,
  HttpRequestMiddleware,
} from "@pagopa/hexagonal-core";

import { GenericError } from "@pagopa/hexagonal-core";
import { Result, err, ok } from "neverthrow";
import z from "zod";

import type { ClientIp } from "../../../../domain/client-ip.js";

import { clientIpSchema } from "../../../../domain/client-ip.js";

const headersSchema = z.object({
  "x-forwarded-for": z.string().min(1),
});

const clientIpExtractionError = (): GenericError =>
  new GenericError("IP address cannot be extracted from the request");

/**
 * Validates a single IP candidate and returns its branded representation.
 */
const validIpFrom = (value: string): Result<ClientIp, GenericError> => {
  const parsedIp = clientIpSchema.safeParse(value);

  return parsedIp.success ? ok(parsedIp.data) : err(clientIpExtractionError());
};

/**
 * Returns the first valid client IP from the comma-separated proxy chain in
 * `x-forwarded-for`.
 *
 * IPv4 candidates may include a port, which is removed before validation.
 * IPv6 candidates are left unchanged because their colon-separated segments
 * are part of the address.
 */
const firstValidForwardedIp = (
  forwardedFor: string,
): Result<ClientIp, GenericError> => {
  for (const entry of forwardedFor.split(",")) {
    const value = entry.trim();
    const hostAndPort = value.split(":");
    const candidate = hostAndPort.length === 2 ? hostAndPort[0] : value;
    const parsedIp = validIpFrom(candidate);

    if (parsedIp.isOk()) {
      return parsedIp;
    }
  }

  return err(clientIpExtractionError());
};

export interface ClientIpContext {
  clientIp: ClientIp;
}

/**
 * Extracts the client IP from the `x-forwarded-for` request header.
 *
 * Returns a `GenericError` when no valid IP can be extracted, preserving the
 * legacy endpoint behavior.
 */
export const makeClientIpMiddleware =
  (): HttpRequestMiddleware<
    EmptyHttpMiddlewareContext,
    ClientIpContext,
    GenericError
  > =>
  async ({ payload }) => {
    const parsedHeaders = headersSchema.safeParse(payload.headers);
    if (!parsedHeaders.success) {
      return err(clientIpExtractionError());
    }

    const clientIp = firstValidForwardedIp(
      parsedHeaders.data["x-forwarded-for"],
    );
    if (clientIp.isErr()) {
      return err(clientIp.error);
    }

    return ok({ clientIp: clientIp.value });
  };
