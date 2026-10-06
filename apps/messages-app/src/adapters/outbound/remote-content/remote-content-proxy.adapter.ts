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

type GenericRemoteContentRepository = RemoteContentMessageAttachmentRepository &
  RemoteContentMessagePreconditionRepository &
  RemoteContentMessageRepository;

export class RemoteContentProxyAdapter implements RemoteContentProxy {
  constructor(
    private readonly genericRepository: GenericRemoteContentRepository,
    private readonly pnServiceId: string,
  ) {}

  private resolveRoute({
    fiscalCode,
    rcConfiguration,
    senderServiceId,
  }: RemoteContentProxyRequest): Result<
    { authentication: RCAuthenticationConfig; baseUrl: URL },
    GenericError
  > {
    if (senderServiceId === this.pnServiceId) {
      return err(
        new GenericError("SEND remote content integration is not available."),
      );
    }

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
    });
  }

  async getRemoteContentMessage(
    request: RemoteContentProxyRequest,
  ): ReturnType<RemoteContentProxy["getRemoteContentMessage"]> {
    const route = this.resolveRoute(request);
    if (route.isErr()) return err(route.error);

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

    return this.genericRepository.getRemoteContentMessagePrecondition(
      route.value.baseUrl,
      route.value.authentication,
      request.thirdPartyMessageId,
      request.fiscalCode,
      request.lollipopHeaders,
    );
  }
}
