import type {
  FiscalCode,
  NotFoundError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";
import type { AssertionRef } from "io-messages-common/adapters/lollipop/definitions/assertion-ref";
import type { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import type { LollipopRequiredHeaders } from "io-messages-common/adapters/lollipop/definitions/request-headers";
import type { RCConfiguration } from "io-messages-common/domain/remote-content";
import type { RemoteContentAttachmentUrl } from "io-messages-common/domain/remote-content-message-attachment";
import type { Result } from "neverthrow";

import {
  ForbiddenError,
  GenericError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { lollipopRequestHeadersSchema } from "io-messages-common/adapters/lollipop/definitions/request-headers";
import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import { err, ok } from "neverthrow";

import type { ServiceToRCConfigMap } from "../../adapters/inbound/config/config.js";
import type { MalformedEntityError } from "../ports/error.js";
import type { MessageContent } from "../ports/message-content.js";
import type { MessageContentRepository } from "../ports/message-content.js";
import type { MessageMetadataRepository } from "../ports/message-metadata.js";
import type { RCConfigurationRepository } from "../ports/rc-configuration.js";
import type { RemoteContentProxy } from "../ports/remote-content-proxy.js";
import type { BuildLollipopHeadersUseCase } from "./build-lollipop-headers.use-case.js";

import { LollipopHeadersBuildError } from "../ports/lc-params.js";
import {
  RemoteContentAttachmentUnsupportedMediaTypeError,
  RemoteContentServiceUnavailableError,
} from "../ports/remote-content-message-attachment.js";

type GetRemoteContentMessageAttachmentError =
  | ForbiddenError
  | GenericError
  | LollipopHeadersBuildError
  | MalformedEntityError
  | NotFoundError
  | RemoteContentAttachmentUnsupportedMediaTypeError
  | RemoteContentServiceUnavailableError
  | TooManyRequestsError
  | ValidationError;

export type GetRemoteContentMessageAttachmentUseCase = UseCase<
  {
    assertionRef?: AssertionRef;
    attachmentUrl: RemoteContentAttachmentUrl;
    fiscalCode: FiscalCode;
    lollipopRequestHeaders?: Partial<
      Record<keyof LollipopRequiredHeaders, string>
    >;
    messageId: string;
  },
  Buffer,
  GetRemoteContentMessageAttachmentError
>;

const getConfigurationId = (
  content: MessageContent,
  senderServiceId: string,
  serviceToRCMap: ServiceToRCConfigMap,
): Result<string, GenericError | ValidationError> => {
  if (!content.third_party_data) {
    return err(
      new ValidationError("The message is not a remote content message"),
    );
  }

  const configurationId =
    content.third_party_data.configuration_id ??
    serviceToRCMap.get(senderServiceId);
  return configurationId
    ? ok(configurationId)
    : err(
        new GenericError(
          `Cannot find remote content configuration for service ${senderServiceId}`,
        ),
      );
};

const isLollipopRequired = (
  configuration: RCConfiguration,
  fiscalCode: FiscalCode,
): boolean =>
  configuration.isLollipopEnabled &&
  !configuration.disableLollipopFor.includes(
    fiscalCodeSchema.parse(fiscalCode),
  );

const buildRequiredLollipopHeaders = async (
  buildLollipopHeaders: BuildLollipopHeadersUseCase,
  configuration: RCConfiguration,
  assertionRef: AssertionRef | undefined,
  fiscalCode: FiscalCode,
  lollipopRequestHeaders?: Partial<
    Record<keyof LollipopRequiredHeaders, string>
  >,
): Promise<Result<LollipopHeaders | undefined, LollipopHeadersBuildError>> => {
  if (!isLollipopRequired(configuration, fiscalCode)) return ok(undefined);

  const requestHeaders = lollipopRequestHeadersSchema.safeParse(
    lollipopRequestHeaders,
  );
  if (!requestHeaders.success) {
    return err(
      new LollipopHeadersBuildError(
        `Bad request ${requestHeaders.error.message}`,
      ),
    );
  }

  const result = await buildLollipopHeaders({
    assertionRef,
    fiscalCode: fiscalCodeSchema.parse(fiscalCode),
    requestHeaders: requestHeaders.data,
  });
  return result.isErr()
    ? err(new LollipopHeadersBuildError("Error extracting lollipop locals"))
    : ok(result.value);
};

const isPdf = (attachment: Buffer): boolean =>
  attachment.toString("binary", 0, 4) === "%PDF";

export const makeGetRemoteContentMessageAttachmentUseCase =
  (
    messageMetadataRepository: MessageMetadataRepository,
    messageContentRepository: MessageContentRepository,
    remoteContentConfigurationRepository: RCConfigurationRepository,
    remoteContentProxy: RemoteContentProxy,
    buildLollipopHeaders: BuildLollipopHeadersUseCase,
    serviceToRCMap: ServiceToRCConfigMap,
  ): GetRemoteContentMessageAttachmentUseCase =>
  async ({
    assertionRef,
    attachmentUrl,
    fiscalCode,
    lollipopRequestHeaders,
    messageId,
  }) => {
    const [metadataResult, contentResult] = await Promise.all([
      messageMetadataRepository.getMessageMetadataByFiscalCodeAndId(
        fiscalCode,
        messageId,
      ),
      messageContentRepository.getMessageContentById(messageId),
    ]);
    if (metadataResult.isErr()) return err(metadataResult.error);
    if (contentResult.isErr()) return err(contentResult.error);

    const metadata = metadataResult.value;
    const content = contentResult.value;
    const thirdPartyData = content.third_party_data;
    if (!thirdPartyData) {
      return err(
        new ValidationError("The message is not a remote content message"),
      );
    }

    const configurationId = getConfigurationId(
      content,
      metadata.senderServiceId,
      serviceToRCMap,
    );
    if (configurationId.isErr()) return err(configurationId.error);

    const configurationResult =
      await remoteContentConfigurationRepository.getRemoteContentConfiguration(
        configurationId.value,
      );
    if (configurationResult.isErr()) return err(configurationResult.error);

    const configuration = configurationResult.value;
    const lollipopHeaders = await buildRequiredLollipopHeaders(
      buildLollipopHeaders,
      configuration,
      assertionRef,
      fiscalCode,
      lollipopRequestHeaders,
    );
    if (lollipopHeaders.isErr()) return err(lollipopHeaders.error);

    const attachmentResult =
      await remoteContentProxy.getRemoteContentMessageAttachment({
        attachmentUrl,
        fiscalCode,
        lollipopHeaders: lollipopHeaders.value,
        rcConfiguration: configuration,
        senderServiceId: metadata.senderServiceId,
        thirdPartyMessageId: thirdPartyData.id,
      });
    if (attachmentResult.isErr()) return err(attachmentResult.error);

    return isPdf(attachmentResult.value)
      ? ok(attachmentResult.value)
      : err(
          new RemoteContentAttachmentUnsupportedMediaTypeError(
            "The requested file is not a valid PDF",
          ),
        );
  };
