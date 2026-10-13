import {
  FiscalCode,
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  UseCase,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { AssertionRef } from "io-messages-common/adapters/lollipop/definitions/assertion-ref";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import {
  LollipopRequiredHeaders,
  lollipopRequestHeadersSchema,
} from "io-messages-common/adapters/lollipop/definitions/request-headers";
import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import { MessageId } from "io-messages-common/domain/message";
import { RCConfiguration } from "io-messages-common/domain/remote-content";
import {
  RemoteContentMessage,
  remoteContentMessageSchema,
} from "io-messages-common/domain/remote-content-message";
import { SendNotificationResponse } from "io-messages-common/domain/send-notification";
import { Result, err, ok } from "neverthrow";

import { ServiceToRCConfigMap } from "../../adapters/inbound/config/config.js";
import { MalformedEntityError } from "../ports/error.js";
import { LollipopHeadersBuildError } from "../ports/lc-params.js";
import {
  MessageContent,
  MessageContentRepository,
} from "../ports/message-content.js";
import { MessageMetadataRepository } from "../ports/message-metadata.js";
import { RCConfigurationRepository } from "../ports/rc-configuration.js";
import { RemoteContentMessageBadGatewayError } from "../ports/remote-content-message.js";
import { RemoteContentProxy } from "../ports/remote-content-proxy.js";
import { BuildLollipopHeadersUseCase } from "./build-lollipop-headers.use-case.js";

type GetRemoteContentMessageError =
  | ForbiddenError
  | GenericError
  | LollipopHeadersBuildError
  | MalformedEntityError
  | NotFoundError
  | RemoteContentMessageBadGatewayError
  | TooManyRequestsError
  | ValidationError;

export interface RemoteContentMessageOutput {
  content: MessageContent;
  created_at: string;
  fiscal_code: string;
  id: string;
  sender_service_id: string;
  third_party_message: RemoteContentMessage | SendNotificationResponse;
  time_to_live?: number;
}

export type GetRemoteContentMessageUseCase = UseCase<
  {
    assertionRef?: AssertionRef;
    fiscalCode: FiscalCode;
    lollipopRequestHeaders?: Partial<
      Record<keyof LollipopRequiredHeaders, string>
    >;
    messageId: MessageId;
  },
  RemoteContentMessageOutput,
  GetRemoteContentMessageError
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

  if (content.third_party_data.configuration_id) {
    return ok(content.third_party_data.configuration_id);
  }

  const configurationId = serviceToRCMap.get(senderServiceId);
  if (!configurationId) {
    return err(
      new GenericError(
        `Cannot find remote content configuration for service ${senderServiceId}`,
      ),
    );
  }

  return ok(configurationId);
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
  if (!isLollipopRequired(configuration, fiscalCode)) {
    return ok(undefined);
  }

  const parsedRequestHeaders = lollipopRequestHeadersSchema.safeParse(
    lollipopRequestHeaders,
  );
  if (!parsedRequestHeaders.success) {
    return err(
      new LollipopHeadersBuildError(
        `Bad request ${parsedRequestHeaders.error.message}`,
      ),
    );
  }

  const lollipopHeadersResult = await buildLollipopHeaders({
    assertionRef,
    fiscalCode: fiscalCodeSchema.parse(fiscalCode),
    requestHeaders: parsedRequestHeaders.data,
  });
  if (lollipopHeadersResult.isErr()) {
    return err(
      new LollipopHeadersBuildError("Error extracting lollipop locals"),
    );
  }

  return ok(lollipopHeadersResult.value);
};

const validateAndFilterRemoteMessage = (
  content: MessageContent,
  remoteMessage: RemoteContentMessage,
): Result<RemoteContentMessage, RemoteContentMessageBadGatewayError> => {
  const thirdPartyData = content.third_party_data;
  if (!thirdPartyData) {
    return err(
      new RemoteContentMessageBadGatewayError(
        "REMOTE_CONTENT_MESSAGE_WITHOUT_THIRD_PARTY_DATA",
      ),
    );
  }

  const shouldContainAttachments = thirdPartyData.has_attachments;
  const shouldContainRemoteContent = thirdPartyData.has_remote_content;

  if (
    shouldContainAttachments &&
    (!remoteMessage.attachments || remoteMessage.attachments.length === 0)
  ) {
    return err(
      new RemoteContentMessageBadGatewayError("ATTACHMENTS_NOT_PRESENT"),
    );
  }

  if (shouldContainRemoteContent && !remoteMessage.details) {
    return err(
      new RemoteContentMessageBadGatewayError("REMOTE_CONTENT_NOT_PRESENT"),
    );
  }

  if (shouldContainRemoteContent) {
    const markdown = remoteMessage.details?.markdown;
    const subject = remoteMessage.details?.subject;

    if (typeof markdown !== "string" || markdown.length < 80) {
      return err(
        new RemoteContentMessageBadGatewayError("MARKDOWN_VALIDATION_ERROR"),
      );
    }

    if (typeof subject !== "string" || subject.length < 10) {
      return err(
        new RemoteContentMessageBadGatewayError("SUBJECT_VALIDATION_ERROR"),
      );
    }
  }

  return ok({
    attachments: shouldContainAttachments ? remoteMessage.attachments : [],
    details: shouldContainRemoteContent
      ? remoteMessage.details
      : {
          ...remoteMessage.details,
          markdown: content.markdown,
          subject: content.subject,
        },
  });
};

const validateGenericRemoteMessage = (
  content: MessageContent,
  response: RemoteContentMessage | SendNotificationResponse,
): Result<RemoteContentMessage, RemoteContentMessageBadGatewayError> => {
  const parsedResponse = remoteContentMessageSchema.safeParse(response);
  if (!parsedResponse.success) {
    return err(
      new RemoteContentMessageBadGatewayError("INVALID_REMOTE_CONTENT_MESSAGE"),
    );
  }

  return validateAndFilterRemoteMessage(content, parsedResponse.data);
};

export const makeGetRemoteContentMessageUseCase =
  (
    messageMetadataRepository: MessageMetadataRepository,
    messageContentRepository: MessageContentRepository,
    remoteContentConfigurationRepository: RCConfigurationRepository,
    remoteContentProxy: RemoteContentProxy,
    buildLollipopHeaders: BuildLollipopHeadersUseCase,
    pnServiceId: string,
    serviceToRCMap: ServiceToRCConfigMap,
  ): GetRemoteContentMessageUseCase =>
  async ({ assertionRef, fiscalCode, lollipopRequestHeaders, messageId }) => {
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
    const configurationIdResult = getConfigurationId(
      content,
      metadata.senderServiceId,
      serviceToRCMap,
    );
    if (configurationIdResult.isErr()) return err(configurationIdResult.error);

    const thirdPartyData = content.third_party_data;
    if (!thirdPartyData) {
      return err(
        new ValidationError("The message is not a remote content message"),
      );
    }

    const configurationResult =
      await remoteContentConfigurationRepository.getRemoteContentConfiguration(
        configurationIdResult.value,
      );
    if (configurationResult.isErr()) return err(configurationResult.error);

    const configuration = configurationResult.value;

    const requiredLollipopHeaders = await buildRequiredLollipopHeaders(
      buildLollipopHeaders,
      configuration,
      assertionRef,
      fiscalCode,
      lollipopRequestHeaders,
    );
    if (requiredLollipopHeaders.isErr()) {
      return err(requiredLollipopHeaders.error);
    }

    const remoteMessageResult =
      await remoteContentProxy.getRemoteContentMessage({
        fiscalCode,
        lollipopHeaders: requiredLollipopHeaders.value,
        rcConfiguration: configuration,
        senderServiceId: metadata.senderServiceId,
        thirdPartyMessageId: thirdPartyData.id,
      });
    if (remoteMessageResult.isErr()) return err(remoteMessageResult.error);

    const thirdPartyMessage =
      metadata.senderServiceId === pnServiceId
        ? ok(remoteMessageResult.value)
        : validateGenericRemoteMessage(content, remoteMessageResult.value);
    if (thirdPartyMessage.isErr()) return err(thirdPartyMessage.error);

    return ok({
      content,
      created_at: metadata.createdAt,
      fiscal_code: metadata.fiscalCode,
      id: metadata.id,
      sender_service_id: metadata.senderServiceId,
      third_party_message: thirdPartyMessage.value,
      time_to_live: metadata.timeToLiveSeconds,
    });
  };
