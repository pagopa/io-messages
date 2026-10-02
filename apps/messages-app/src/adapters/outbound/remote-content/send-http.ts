import { FiscalCode, GenericError, Logger } from "@pagopa/hexagonal-core";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";
import {
  RemoteContentMessagePrecondition,
  remoteContentMessagePreconditionSchema,
} from "io-messages-common/domain/remote-content-message-precondition";
import {
  SendNotificationResponse,
  SendNotificationResponseSchema,
} from "io-messages-common/domain/send-notification";
import { Result, err, ok } from "neverthrow";

import { SendNotificationRepository } from "../../../application/ports/send-notification.js";
import { SendNotificationPreconditionRepository } from "../../../application/ports/send-notification-precondition.js";
import { Client, createClient } from "../../../generated/send/client/index.js";
import {
  getReceivedNotification,
  getReceivedNotificationPrecondition,
} from "../../../generated/send/sdk.gen.js";
import { PreconditionContent } from "../../../generated/send/types.gen.js";

export class SendHTTPAdapter
  implements SendNotificationPreconditionRepository, SendNotificationRepository
{
  readonly #client: Client;
  readonly #logger: Logger;

  constructor(logger: Logger) {
    this.#client = createClient();
    this.#logger = logger;
  }

  private toErrorBody(error: unknown) {
    if (typeof error === "string") return error;
    if (error instanceof Error) return error.message;

    const errorBody = Result.fromThrowable(
      () => JSON.stringify(error),
      () => undefined,
    )().unwrapOr(undefined);

    return errorBody ?? "unreadable response body";
  }

  private validateMessageDetailSuccessResponse(
    response: SendNotificationResponse | undefined,
  ): Result<SendNotificationResponse, GenericError> {
    const parsedResponse = SendNotificationResponseSchema.safeParse(response);
    if (!parsedResponse.success)
      return err(new GenericError(`Invalid response shape from SEND service.`));

    return ok(parsedResponse.data);
  }

  private validateMessagePreconditionSuccessResponse(
    response: PreconditionContent | undefined,
  ): Result<RemoteContentMessagePrecondition, GenericError> {
    const parsedResponse =
      remoteContentMessagePreconditionSchema.safeParse(response);
    if (!parsedResponse.success)
      return err(
        new GenericError(
          `Invalid precondition response shape from SEND service.`,
        ),
      );

    return ok(parsedResponse.data);
  }

  async getNotification(
    baseUrl: URL,
    authentication: RCAuthenticationConfig,
    iun: string,
    fiscalCode: FiscalCode,
    lollipopHeaders?: LollipopHeaders,
  ) {
    const getNotificationResult = await getReceivedNotification({
      baseUrl: baseUrl.toString().replace(/\/+$/, ""),
      client: this.#client,
      headers: {
        ...lollipopHeaders,
        // Hey API's `auth` option requires a static security header name,
        // while each Remote Content provider configures its own.
        [authentication.headerKeyName]: authentication.key,
        "x-pagopa-cx-taxid": fiscalCode,
      },
      path: { iun },
      redirect: "manual",
    });

    if (!getNotificationResult.response) {
      return err(
        new GenericError(this.toErrorBody(getNotificationResult.error)),
      );
    }

    if (getNotificationResult.response.status === 200) {
      // When dealing with SEND only 200 is considered a success response.
      return this.validateMessageDetailSuccessResponse(
        getNotificationResult.data,
      );
    }

    this.#logger.trackEvent({
      name: "SendHTTPAdapter.getNotification.failed",
      properties: {
        baseURL: baseUrl.toString(),
        iun,
      },
    });

    return err(
      new GenericError(
        `Failed to fetch PN ReceivedNotification: ${getNotificationResult.response.status}`,
      ),
    );
  }

  async getNotificationPrecondition(
    baseUrl: URL,
    authentication: RCAuthenticationConfig,
    iun: string,
    fiscalCode: FiscalCode,
    lollipopHeaders?: LollipopHeaders,
  ) {
    const getPreconditionResult = await getReceivedNotificationPrecondition({
      baseUrl: baseUrl.toString().replace(/\/+$/, ""),
      client: this.#client,
      headers: {
        ...lollipopHeaders,
        // Hey API's `auth` option requires a static security header name,
        // while each Remote Content provider configures its own.
        [authentication.headerKeyName]: authentication.key,
        "x-pagopa-cx-taxid": fiscalCode,
      },
      path: { iun },
      redirect: "manual",
    });

    if (!getPreconditionResult.response) {
      return err(
        new GenericError(this.toErrorBody(getPreconditionResult.error)),
      );
    }

    if (getPreconditionResult.response.status === 200) {
      return this.validateMessagePreconditionSuccessResponse(
        getPreconditionResult.data,
      );
    }

    this.#logger.trackEvent({
      name: "SendHTTPAdapter.getNotificationPrecondition.failed",
      properties: {
        baseURL: baseUrl.toString(),
        iun,
      },
    });

    return err(
      new GenericError(
        `Failed to fetch PN ReceivedPrecondition: ${getPreconditionResult.response.status}`,
      ),
    );
  }
}
