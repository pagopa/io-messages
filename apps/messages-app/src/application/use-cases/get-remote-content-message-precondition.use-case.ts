import type { FiscalCode, UseCase } from "@pagopa/hexagonal-core";
import type { AssertionRef } from "io-messages-common/adapters/lollipop/definitions/assertion-ref";
import type { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import type { RemoteContentMessagePrecondition } from "io-messages-common/domain/remote-content-message-precondition";

import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { lollipopRequestHeadersSchema } from "io-messages-common/adapters/lollipop/definitions/request-headers";
import { err } from "neverthrow";

import type { ServiceToRCConfigMap } from "../../adapters/inbound/config/config.js";
import type { MessageContentRepository } from "../ports/message-content.js";
import type { MessageMetadataRepository } from "../ports/message-metadata.js";
import type { RCConfigurationRepository } from "../ports/rc-configuration.js";
import type {
  RemoteContentMessageError,
  RemoteContentProxy,
} from "../ports/remote-content-proxy.js";
import type { BuildLollipopHeadersUseCase } from "./build-lollipop-headers.use-case.js";

import { MalformedEntityError } from "../ports/error.js";

export interface GetRemoteContentMessagePreconditionInput {
  assertionRef: AssertionRef | undefined;
  fiscalCode: FiscalCode;
  lollipopRequestHeaders: unknown;
  messageId: string;
}

export type GetRemoteContentMessagePreconditionError =
  | GenericError
  | MalformedEntityError
  | NotFoundError
  | RemoteContentMessageError
  | TooManyRequestsError
  | ValidationError;

export type GetRemoteContentMessagePreconditionUseCase = UseCase<
  GetRemoteContentMessagePreconditionInput,
  RemoteContentMessagePrecondition,
  GetRemoteContentMessagePreconditionError
>;

export const makeGetRemoteContentMessagePreconditionUseCase =
  (
    messageMetadataRepository: MessageMetadataRepository,
    messageContentRepository: MessageContentRepository,
    rcConfigurationRepository: RCConfigurationRepository,
    remoteContentProxy: RemoteContentProxy,
    buildLollipopHeaders: BuildLollipopHeadersUseCase,
    serviceToRCMap: ServiceToRCConfigMap,
  ): GetRemoteContentMessagePreconditionUseCase =>
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
    const thirdPartyData = contentResult.value.third_party_data;
    if (!thirdPartyData) {
      return err(
        new ValidationError(
          "The message retrieved is not a valid message with third-party data",
        ),
      );
    }

    const configurationId =
      thirdPartyData.configuration_id ??
      serviceToRCMap.get(metadata.senderServiceId);
    if (!configurationId) {
      return err(
        new GenericError(
          `Cannot find remote content configuration for service ${metadata.senderServiceId}`,
        ),
      );
    }

    const configurationResult =
      await rcConfigurationRepository.getRemoteContentConfiguration(
        configurationId,
      );
    if (configurationResult.isErr()) return err(configurationResult.error);
    const rcConfiguration = configurationResult.value;

    const isLollipopRequired =
      rcConfiguration.isLollipopEnabled &&
      !rcConfiguration.disableLollipopFor.includes(fiscalCode);

    let lollipopHeaders: LollipopHeaders | undefined;
    if (isLollipopRequired) {
      const parsedLollipopRequestHeaders =
        lollipopRequestHeadersSchema.safeParse(lollipopRequestHeaders);
      if (!parsedLollipopRequestHeaders.success) {
        return err(
          new GenericError(
            "Bad request: missing or invalid required lollipop headers",
          ),
        );
      }

      const lollipopResult = await buildLollipopHeaders({
        assertionRef,
        fiscalCode,
        requestHeaders: parsedLollipopRequestHeaders.data,
      });
      if (lollipopResult.isErr()) {
        return err(new GenericError("Error extracting lollipop locals"));
      }
      lollipopHeaders = lollipopResult.value;
    }

    return remoteContentProxy.getRemoteContentMessagePrecondition({
      fiscalCode,
      lollipopHeaders,
      rcConfiguration,
      senderServiceId: metadata.senderServiceId,
      thirdPartyMessageId: thirdPartyData.id,
    });
  };
