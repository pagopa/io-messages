import { FiscalCode, GenericError, Logger } from "@pagopa/hexagonal-core";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";
import {
  RemoteContentAttachmentUrl,
  RemoteContentMessageAttachment,
} from "io-messages-common/domain/remote-content-message-attachment";
import {
  RemoteContentMessagePrecondition,
  remoteContentMessagePreconditionSchema,
} from "io-messages-common/domain/remote-content-message-precondition";
import {
  SendNotificationResponse,
  SendNotificationResponseSchema,
} from "io-messages-common/domain/send-notification";
import { Result, err, ok } from "neverthrow";

import { RemoteContentServiceUnavailableError } from "../../../application/ports/remote-content-message-attachment.js";
import { SendNotificationRepository } from "../../../application/ports/send-notification.js";
import { SendNotificationAttachmentRepository } from "../../../application/ports/send-notification-attachment.js";
import { SendNotificationPreconditionRepository } from "../../../application/ports/send-notification-precondition.js";
import { Client, createClient } from "../../../generated/send/client/index.js";
import {
  getReceivedNotification,
  getReceivedNotificationAttachment,
  getReceivedNotificationPrecondition,
  getSentNotificationDocument,
} from "../../../generated/send/sdk.gen.js";
import { PreconditionContent } from "../../../generated/send/types.gen.js";
import { zNotificationAttachmentDownloadMetadataResponse } from "../../../generated/send/zod.gen.js";

type SendAttachmentPath =
  | {
      attachmentIdx: number;
      attachmentName: string;
      iun: string;
      type: "payment";
    }
  | {
      docIdx: number;
      iun: string;
      type: "document";
    };

export class SendHTTPAdapter
  implements
    SendNotificationAttachmentRepository,
    SendNotificationPreconditionRepository,
    SendNotificationRepository
{
  readonly #client: Client;
  readonly #logger: Logger;

  constructor(logger: Logger) {
    this.#client = createClient();
    this.#logger = logger;
  }

  private parseAttachmentPath(
    attachmentURL: RemoteContentAttachmentUrl,
  ): Result<SendAttachmentPath, GenericError> {
    const [path, query] = attachmentURL.split("?", 2);
    const documentMatch = path?.match(
      /^\/?delivery\/+notifications\/+received\/+([^/]+)\/+attachments\/+documents\/+(-?\d+)$/,
    );

    if (documentMatch?.[1] && documentMatch[2] && query === undefined) {
      return ok({
        docIdx: Number(documentMatch[2]),
        iun: documentMatch[1],
        type: "document",
      });
    }

    const paymentMatch = path?.match(
      /^\/?delivery\/+notifications\/+received\/+([^/]+)\/+attachments\/+payment\/+([^/]+)\/?$/,
    );
    const attachmentIdx = query
      ? new URLSearchParams(query).get("attachmentIdx")
      : undefined;

    if (
      paymentMatch?.[1] &&
      paymentMatch[2] &&
      attachmentIdx &&
      /^-?\d+$/.test(attachmentIdx)
    ) {
      return ok({
        attachmentIdx: Number(attachmentIdx),
        attachmentName: paymentMatch[2],
        iun: paymentMatch[1],
        type: "payment",
      });
    }

    return err(
      new GenericError(
        `Can not distinguish a PN document URL from a PN payment URL: ${attachmentURL}`,
      ),
    );
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

  async getNotificationAttachment(
    baseUrl: URL,
    authentication: RCAuthenticationConfig,
    iun: string,
    attachmentURL: RemoteContentAttachmentUrl,
    fiscalCode: FiscalCode,
    lollipopHeaders?: LollipopHeaders,
  ): Promise<
    Result<
      RemoteContentMessageAttachment,
      GenericError | RemoteContentServiceUnavailableError
    >
  > {
    const attachmentPathResult = this.parseAttachmentPath(attachmentURL);
    if (attachmentPathResult.isErr()) {
      return err(attachmentPathResult.error);
    }

    const attachmentPath = attachmentPathResult.value;

    const baseRequest = {
      baseUrl: baseUrl.toString().replace(/\/+$/, ""),
      client: this.#client,
      headers: {
        ...lollipopHeaders,
        // Hey API's `auth` option requires a static security header name,
        // while each Remote Content provider configures its own.
        [authentication.headerKeyName]: authentication.key,
        "x-pagopa-cx-taxid": fiscalCode,
      },
      redirect: "manual",
    } as const;

    const getMetadataResult =
      attachmentPath.type === "document"
        ? await getSentNotificationDocument({
            ...baseRequest,
            path: {
              docIdx: attachmentPath.docIdx,
              iun: attachmentPath.iun,
            },
          })
        : await getReceivedNotificationAttachment({
            ...baseRequest,
            path: {
              attachmentName: attachmentPath.attachmentName,
              iun: attachmentPath.iun,
            },
            query: {
              attachmentIdx: attachmentPath.attachmentIdx,
            },
          });

    if (!getMetadataResult.response) {
      return err(new GenericError(this.toErrorBody(getMetadataResult.error)));
    }

    if (getMetadataResult.response.status !== 200) {
      this.#logger.trackEvent({
        name: "SendHTTPAdapter.getNotificationAttachment.failed",
        properties: {
          attachmentURL,
          baseURL: baseUrl.toString(),
          iun,
        },
      });

      const operation =
        attachmentPath.type === "document"
          ? "SentNotificationDocument"
          : "ReceivedNotificationAttachment";
      return err(
        new GenericError(
          `Failed to fetch PN ${operation}: ${getMetadataResult.response.status}`,
        ),
      );
    }

    const metadata = zNotificationAttachmentDownloadMetadataResponse.safeParse(
      getMetadataResult.data,
    );
    if (!metadata.success) {
      return err(
        new GenericError(`Invalid attachment metadata response from SEND.`),
      );
    }

    if (metadata.data.url) {
      try {
        const downloadResponse = await fetch(metadata.data.url);
        if (downloadResponse.status !== 200) {
          return err(
            new GenericError(
              `Failed to fetch PN download attachment: ${downloadResponse.status}`,
            ),
          );
        }

        return ok(Buffer.from(await downloadResponse.arrayBuffer()));
      } catch (error) {
        return err(new GenericError(this.toErrorBody(error)));
      }
    }

    if (metadata.data.retryAfter !== undefined) {
      this.#logger.trackEvent({
        name: "SendHTTPAdapter.getNotificationAttachment.failed.serviceUnavailable",
        properties: {
          attachmentURL,
          baseURL: baseUrl.toString(),
          iun,
        },
      });
      return err(
        new RemoteContentServiceUnavailableError(
          metadata.data.retryAfter.toString(),
        ),
      );
    }

    return err(
      new GenericError(
        `The SEND attachment metadata contains neither url nor retryAfter.`,
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
