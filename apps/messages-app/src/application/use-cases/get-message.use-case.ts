import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";
import { Result, err, ok } from "neverthrow";

import { ServiceToRCConfigMap } from "../../adapters/inbound/config/config.js";
import { MalformedEntityError } from "../ports/error.js";
import {
  MessageContent,
  MessageContentRepository,
} from "../ports/message-content.js";
import { MessageMetadataRepository } from "../ports/message-metadata.js";
import { MessageStatusRepository } from "../ports/message-status.js";
import { MessageCategory } from "../ports/messages.js";
import {
  ServicesCmsDetail,
  ServicesCmsRepository,
} from "../ports/services-cms.js";

type GetMessageError =
  | GenericError
  | MalformedEntityError
  | NotFoundError
  | TooManyRequestsError;

export interface MessageWithContent {
  content: MessageContent;
  created_at: string;
  fiscal_code: string;
  id: string;
  sender_service_id: string;
  time_to_live?: number;
}

export interface EnrichedMessageWithContent extends MessageWithContent {
  category: MessageCategory;
  is_archived: boolean;
  is_read: boolean;
  message_title: string;
  organization_fiscal_code: string;
  organization_name: string;
  service_name: string;
}

export interface GetMessageOutput {
  message: EnrichedMessageWithContent | MessageWithContent;
}

export type GetMessageUseCase = UseCase<
  {
    fiscalCode: string;
    messageId: string;
    publicMessage: boolean;
  },
  GetMessageOutput,
  GetMessageError
>;

const getService = async (
  repository: ServicesCmsRepository,
  serviceId: string,
): Promise<Result<ServicesCmsDetail, GetMessageError>> => {
  const response = await repository.getServicesCmsDetailsByServiceIds([
    serviceId,
  ]);
  if (response.isErr()) return err(response.error);

  const service = response.value.get(serviceId);
  if (!service) {
    return err(
      new GenericError(`Cannot find service details for service ${serviceId}`),
    );
  }

  return service.isErr()
    ? err(new GenericError(service.error.message))
    : service;
};

const computeCategory = (
  content: MessageContent,
  senderServiceId: string,
  pnServiceId: string,
  service: ServicesCmsDetail,
): MessageCategory => {
  if (content.eu_covid_cert) return { tag: "EU_COVID_CERT" };

  if (content.third_party_data) {
    return senderServiceId === pnServiceId
      ? { ...content.third_party_data, tag: "PN" }
      : { tag: "GENERIC" };
  }

  if (content.payment_data) {
    return {
      rptId: `${content.payment_data.payee?.fiscal_code ?? service.organization.fiscal_code}${content.payment_data.notice_number}`,
      tag: "PAYMENT",
    };
  }

  return { tag: "GENERIC" };
};

export const makeGetMessageUseCase =
  (
    messageMetadataRepository: MessageMetadataRepository,
    messageStatusRepository: MessageStatusRepository,
    messageContentRepository: MessageContentRepository,
    servicesCmsRepository: ServicesCmsRepository,
    pnServiceId: string,
    serviceToRCMap: ServiceToRCConfigMap,
  ): GetMessageUseCase =>
  async ({ fiscalCode, messageId, publicMessage }) => {
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
    let content = contentResult.value;
    let service: ServicesCmsDetail | undefined;

    if (content.payment_data && !content.payment_data.payee?.fiscal_code) {
      const serviceResult = await getService(
        servicesCmsRepository,
        metadata.senderServiceId,
      );
      if (serviceResult.isErr()) return err(serviceResult.error);

      service = serviceResult.value;
      content = {
        ...content,
        payment_data: {
          ...content.payment_data,
          payee: { fiscal_code: service.organization.fiscal_code },
        },
      };
    }

    if (
      content.third_party_data &&
      !content.third_party_data.configuration_id
    ) {
      const configurationId = serviceToRCMap.get(metadata.senderServiceId);
      if (!configurationId) {
        return err(
          new GenericError(
            `Cannot find remote content configuration for service ${metadata.senderServiceId}`,
          ),
        );
      }

      content = {
        ...content,
        third_party_data: {
          ...content.third_party_data,
          configuration_id: configurationId,
        },
      };
    }

    const message: MessageWithContent = {
      content,
      created_at: metadata.createdAt,
      fiscal_code: metadata.fiscalCode,
      id: metadata.id,
      sender_service_id: metadata.senderServiceId,
      time_to_live: metadata.timeToLiveSeconds,
    };

    if (!publicMessage) return ok({ message });

    const statusResult =
      await messageStatusRepository.getLatestMessageStatusById(messageId);
    if (statusResult.isErr()) return err(statusResult.error);

    if (!service) {
      const serviceResult = await getService(
        servicesCmsRepository,
        metadata.senderServiceId,
      );
      if (serviceResult.isErr()) return err(serviceResult.error);
      service = serviceResult.value;
    }

    return ok({
      message: {
        ...message,
        category: computeCategory(
          content,
          metadata.senderServiceId,
          pnServiceId,
          service,
        ),
        is_archived: statusResult.value.isArchived,
        is_read: statusResult.value.isRead,
        message_title: content.subject,
        organization_fiscal_code: service.organization.fiscal_code,
        organization_name: service.organization.name,
        service_name: service.name,
      },
    });
  };
