import { FiscalCode, GenericError, Logger } from "@pagopa/hexagonal-core";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";
import {
  SendNotificationResponse,
  SendNotificationResponseSchema,
} from "io-messages-common/domain/send-notification";
import { Result, err, ok } from "neverthrow";

import { SendNotificationRepository } from "../../../application/ports/send-notification.js";
import { Client, createClient } from "../../../generated/send/client/index.js";
import { getReceivedNotification } from "../../../generated/send/sdk.gen.js";

export class SendHTTPAdapter implements SendNotificationRepository {
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
        // while each Remote Content provider configures its own.
        [authentication.headerKeyName]: authentication.key,
        // Hey API's `auth` option requires a static security header name,
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
}
