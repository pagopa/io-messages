import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { FiscalCode } from "io-messages-common/domain/fiscal-code";
import { MessageId } from "io-messages-common/domain/message";
import { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";
import {
  RemoteContentMessage,
  remoteContentMessageSchema,
} from "io-messages-common/domain/remote-content-message";
import { Result, err, ok } from "neverthrow";

import { RemoteContentMessageRepository } from "../../../application/ports/remote-content-message.js";
import { createClient } from "../../../generated/remote-content/client/client.gen.js";
import { Client } from "../../../generated/remote-content/client/index.js";
import { getRemoteContentMessageDetails } from "../../../generated/remote-content/sdk.gen.js";
import { RemoteContentDetailsResponse } from "../../../generated/remote-content/types.gen.js";

export class RemoteContentHTTPAdapter
  implements RemoteContentMessageRepository
{
  readonly #client: Client;
  readonly #logger: Logger;

  constructor(logger: Logger) {
    this.#client = createClient();
    this.#logger = logger;
  }

  private toErrorBody(error: unknown): string {
    if (typeof error === "string") return error;
    if (error instanceof Error) return error.message;

    const errorBody = Result.fromThrowable(
      () => JSON.stringify(error),
      () => undefined,
    )().unwrapOr(undefined);

    return errorBody ?? "unreadable response body";
  }

  private validateMessageDetailSuccessResponse(
    response: RemoteContentDetailsResponse | undefined,
  ): Result<RemoteContentMessage, GenericError> {
    const parsedResponse = remoteContentMessageSchema.safeParse(response);
    if (!parsedResponse.success)
      return err(
        new GenericError(
          `Invalid response shape from the Remote Content service.`,
        ),
      );

    return ok(parsedResponse.data);
  }

  async getRemoteContentMessage(
    baseURL: URL,
    authentication: RCAuthenticationConfig,
    messageID: MessageId,
    fiscalCode: FiscalCode,
    lollipopHeaders?: LollipopHeaders,
  ) {
    const getRCMessageResult = await getRemoteContentMessageDetails({
      baseUrl: baseURL.toString().replace(/\/+$/, ""),
      client: this.#client,
      headers: {
        fiscal_code: fiscalCode,
        ...lollipopHeaders,
        // Hey API's `auth` option requires a static security header name,
        // while each Remote Content provider configures its own.
        [authentication.headerKeyName]: authentication.key,
      },
      path: { id: messageID },
      redirect: "manual",
    });

    if (!getRCMessageResult.response) {
      return err(new GenericError(this.toErrorBody(getRCMessageResult.error)));
    }

    switch (getRCMessageResult.response.status) {
      case 200:
        return this.validateMessageDetailSuccessResponse(
          getRCMessageResult.data,
        );

      case 400:
        this.#logger.trackEvent({
          name: "RemoteContentHTTPAdapter.getRemoteContentMessage.failed.badRequest",
          properties: {
            baseURL: baseURL.toString(),
            messageID,
          },
        });
        return err(
          new ValidationError(
            `Validation error returned by the Remote Content service.`,
          ),
        );

      case 401:
        this.#logger.trackEvent({
          name: "RemoteContentHTTPAdapter.getRemoteContentMessage.failed.unauthorized",
          properties: {
            baseURL: baseURL.toString(),
            messageID,
          },
        });
        return err(
          new GenericError(
            `The Remote Content service returned HTTP status 401.`,
          ),
        );

      case 403:
        this.#logger.trackEvent({
          name: "RemoteContentHTTPAdapter.getRemoteContentMessage.failed.forbidden",
          properties: {
            baseURL: baseURL.toString(),
            messageID,
          },
        });
        return err(new ForbiddenError());

      case 404:
        this.#logger.trackEvent({
          name: "RemoteContentHTTPAdapter.getRemoteContentMessage.failed.notFound",
          properties: {
            baseURL: baseURL.toString(),
            messageID,
          },
        });
        return err(
          new NotFoundError(
            "RemoteContentMessage",
            `The Remote Content service returned HTTP status 404.`,
          ),
        );

      case 429:
        this.#logger.trackEvent({
          name: "RemoteContentHTTPAdapter.getRemoteContentMessage.failed.tooManyRequests",
          properties: {
            baseURL: baseURL.toString(),
            messageID,
          },
        });
        return err(new TooManyRequestsError());

      case 500:
        return err(
          new GenericError(
            `The Remote Content service returned HTTP status 500.`,
          ),
        );

      default:
        return err(
          new GenericError(
            `The Remote Content service returned an unexpected HTTP status.`,
          ),
        );
    }
  }
}
