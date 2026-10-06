import type { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";

import { GenericError } from "@pagopa/hexagonal-core";
import { Result, err, ok } from "neverthrow";

import type { RemoteContentMessageRepository } from "../../../application/ports/remote-content-message.js";
import type { RemoteContentMessageAttachmentRepository } from "../../../application/ports/remote-content-message-attachment.js";
import type { RemoteContentMessagePreconditionRepository } from "../../../application/ports/remote-content-message-precondition.js";
import type {
  RemoteContentProxy,
  RemoteContentProxyAttachmentRequest,
  RemoteContentProxyRequest,
} from "../../../application/ports/remote-content-proxy.js";
import type { SendNotificationRepository } from "../../../application/ports/send-notification.js";
import type { SendNotificationAttachmentRepository } from "../../../application/ports/send-notification-attachment.js";
import type { SendNotificationPreconditionRepository } from "../../../application/ports/send-notification-precondition.js";

type GenericRemoteContentRepository = RemoteContentMessageAttachmentRepository &
  RemoteContentMessagePreconditionRepository &
  RemoteContentMessageRepository;

type SendRemoteContentRepository = SendNotificationAttachmentRepository &
  SendNotificationPreconditionRepository &
  SendNotificationRepository;

export class RemoteContentProxyAdapter implements RemoteContentProxy {
  constructor(
    private readonly genericRepository: GenericRemoteContentRepository,
    private readonly sendRepository: SendRemoteContentRepository,
    private readonly pnServiceId: string,
  ) {}

  private resolveRoute({
    fiscalCode,
    rcConfiguration,
    senderServiceId,
  }: RemoteContentProxyRequest): Result<
    {
      authentication: RCAuthenticationConfig;
      baseUrl: URL;
      provider: "GENERIC" | "SEND";
    },
    GenericError
  > {
    const environmentName = rcConfiguration.testEnvironment?.testUsers.some(
      (testUser) => String(testUser) === String(fiscalCode),
    )
      ? "TEST"
      : "PROD";
    const environment =
      environmentName === "TEST"
        ? rcConfiguration.testEnvironment
        : rcConfiguration.prodEnvironment;

    if (!environment) {
      return err(
        new GenericError(
          `Remote Content ${environmentName} environment is not configured.`,
        ),
      );
    }

    const baseUrlResult = Result.fromThrowable(
      () => new URL(environment.baseUrl),
      () =>
        new GenericError(
          `Remote Content ${environmentName} base URL is invalid.`,
        ),
    )();
    if (baseUrlResult.isErr()) return err(baseUrlResult.error);

    if (!["http:", "https:"].includes(baseUrlResult.value.protocol)) {
      return err(
        new GenericError(
          `Remote Content ${environmentName} base URL must use HTTP or HTTPS.`,
        ),
      );
    }

    return ok({
      authentication: environment.detailsAuthentication,
      baseUrl: baseUrlResult.value,
      provider: senderServiceId === this.pnServiceId ? "SEND" : "GENERIC",
    });
  }

  async getRemoteContentMessage(
    request: RemoteContentProxyRequest,
  ): ReturnType<RemoteContentProxy["getRemoteContentMessage"]> {
    const route = this.resolveRoute(request);
    if (route.isErr()) return err(route.error);

    if (route.value.provider === "SEND") {
      return this.sendRepository.getNotification(
        route.value.baseUrl,
        route.value.authentication,
        request.thirdPartyMessageId,
        request.fiscalCode,
        request.lollipopHeaders,
      );
    }

    return this.genericRepository.getRemoteContentMessage(
      route.value.baseUrl,
      route.value.authentication,
      request.thirdPartyMessageId,
      request.fiscalCode,
      request.lollipopHeaders,
    );
  }

  async getRemoteContentMessageAttachment(
    request: RemoteContentProxyAttachmentRequest,
  ): ReturnType<RemoteContentProxy["getRemoteContentMessageAttachment"]> {
    const route = this.resolveRoute(request);
    if (route.isErr()) return err(route.error);

    if (route.value.provider === "SEND") {
      return this.sendRepository.getNotificationAttachment(
        route.value.baseUrl,
        route.value.authentication,
        request.thirdPartyMessageId,
        request.attachmentUrl,
        request.fiscalCode,
        request.lollipopHeaders,
      );
    }

    return this.genericRepository.getRemoteContentMessageAttachment(
      route.value.baseUrl,
      route.value.authentication,
      request.thirdPartyMessageId,
      request.attachmentUrl,
      request.fiscalCode,
      request.lollipopHeaders,
    );
  }

  async getRemoteContentMessagePrecondition(
    request: RemoteContentProxyRequest,
  ): ReturnType<RemoteContentProxy["getRemoteContentMessagePrecondition"]> {
    const route = this.resolveRoute(request);
    if (route.isErr()) return err(route.error);

    if (route.value.provider === "SEND") {
      return this.sendRepository.getNotificationPrecondition(
        route.value.baseUrl,
        route.value.authentication,
        request.thirdPartyMessageId,
        request.fiscalCode,
        request.lollipopHeaders,
      );
    }

    return this.genericRepository.getRemoteContentMessagePrecondition(
      route.value.baseUrl,
      route.value.authentication,
      request.thirdPartyMessageId,
      request.fiscalCode,
      request.lollipopHeaders,
    );
  }
}
