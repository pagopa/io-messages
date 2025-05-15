/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Context } from "@azure/functions";
import { CreatedMessageWithoutContent } from "@pagopa/io-functions-commons/dist/generated/definitions/CreatedMessageWithoutContent";
import { EUCovidCert } from "@pagopa/io-functions-commons/dist/generated/definitions/EUCovidCert";
import { EnrichedMessage } from "@pagopa/io-functions-commons/dist/generated/definitions/EnrichedMessage";
import { LegalData } from "@pagopa/io-functions-commons/dist/generated/definitions/LegalData";
import { MessageCategory } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategory";
import { TagEnum as TagEnumBase } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryBase";
import { TagEnum as TagEnumPN } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryPN";
import { TagEnum as TagEnumPayment } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryPayment";
import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";
import { PaymentData } from "@pagopa/io-functions-commons/dist/generated/definitions/PaymentData";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { ThirdPartyData } from "@pagopa/io-functions-commons/dist/generated/definitions/ThirdPartyData";
import { RetrievedMessageStatus } from "@pagopa/io-functions-commons/dist/src/models/message_status";
import {
  RetrievedService,
  ServiceModel,
} from "@pagopa/io-functions-commons/dist/src/models/service";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import * as AR from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import { parse } from "fp-ts/lib/Json";
import * as O from "fp-ts/lib/Option";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";
import { constVoid, flow, pipe } from "fp-ts/lib/function";
import * as S from "fp-ts/string";
import * as t from "io-ts";

import {
  EnrichedMessageWithContent,
  InternalMessageCategory,
} from "../functions/GetMessages/getMessagesFunctions/models";
import { HasPreconditionEnum } from "../generated/definitions/HasPrecondition";
import { MessageStatusExtendedQueryModel } from "../model/message_status_query";
import * as AI from "../utils/AsyncIterableTask";
import { initTelemetryClient } from "./appinsights";
import { IConfig } from "./config";
import { RedisClientFactory } from "./redis";
import { getTask, setWithExpirationTask } from "./redis_storage";
import { createTracker } from "./tracking";

export const trackErrorAndContinue = (
  context: Context,
  error: Error,
  kind: "CONTENT" | "SERVICE" | "STATUS",
  fiscalCode: FiscalCode,
  messageId?: string,
  serviceId?: ServiceId,
  // eslint-disable-next-line max-params
): Error => {
  const message =
    kind === "SERVICE"
      ? `Cannot enrich service data | ${error}`
      : `Cannot enrich message "${messageId}" | ${error}`;

  context.log.error(message);
  createTracker(initTelemetryClient()).messages.trackEnrichmentFailure(
    kind,
    fiscalCode,
    messageId,
    serviceId,
  );
  return error;
};

export type CreatedMessageWithoutContentWithStatus = {
  readonly is_archived: boolean;
  readonly is_read: boolean;
} & CreatedMessageWithoutContent;

export const messageCategoryMappings = (
  message: CreatedMessageWithoutContent,
  messageContent: MessageContent,
  categoryFetcher: ThirdPartyDataWithCategoryFetcher,
) => {
  if (messageContent.eu_covid_cert) {
    return {
      tag: TagEnumBase.EU_COVID_CERT,
    };
  }
  if (messageContent.legal_data) {
    return {
      tag: TagEnumBase.LEGAL_MESSAGE,
    };
  }
  if (messageContent.third_party_data) {
    return {
      tag: categoryFetcher(message.sender_service_id).category,
      has_attachments: messageContent.third_party_data.has_attachments,
      has_remote_content: messageContent.third_party_data.has_remote_content,
      id: messageContent.third_party_data.id,
      original_receipt_date:
        messageContent.third_party_data.original_receipt_date,
      original_sender: messageContent.third_party_data.original_sender,
      summary: messageContent.third_party_data.summary,
    };
  }
  if (messageContent.payment_data) {
    return {
      tag: TagEnumPayment.PAYMENT,
      noticeNumber: messageContent.payment_data.notice_number,
      payeeFiscalCode: messageContent.payment_data.payee?.fiscal_code,
    };
  }
  return {
    tag: TagEnumBase.GENERIC,
  };
};

export const mapMessageCategory = flow(
  messageCategoryMappings,
  InternalMessageCategory.decode,
  E.getOrElseW(() => ({
    tag: TagEnumBase.GENERIC,
  })),
);

export const getOrCacheService = (
  serviceId: ServiceId,
  serviceModel: ServiceModel,
  redisClientFactory: RedisClientFactory,
  serviceCacheTtl: NonNegativeInteger,
): TE.TaskEither<Error, RetrievedService> =>
  pipe(
    getTask(redisClientFactory, serviceId),
    TE.chain(TE.fromOption(() => new Error("Cannot Get Service from Redis"))),
    TE.chainEitherK(
      flow(
        parse,
        E.mapLeft(() => new Error("Cannot parse Service Json from Redis")),
        E.chain(
          flow(
            RetrievedService.decode,
            E.mapLeft(() => new Error("Cannot decode Service Json from Redis")),
          ),
        ),
      ),
    ),
    TE.orElse(() =>
      pipe(
        serviceModel.findLastVersionByModelId([serviceId]),
        TE.mapLeft((e) => new Error(`${e.kind}, ServiceId=${serviceId}`)),
        TE.chain(
          TE.fromOption(
            () => new Error(`EMPTY_SERVICE, ServiceId=${serviceId}`),
          ),
        ),
        TE.chain((service) =>
          pipe(
            setWithExpirationTask(
              redisClientFactory,
              serviceId,
              JSON.stringify(service),
              serviceCacheTtl,
            ),
            TE.map(() => service),
            TE.orElse(() => TE.of(service)),
          ),
        ),
      ),
    ),
  );

export const computeFlagFromHasPrecondition = (
  has_precondition: HasPreconditionEnum,
  is_read: boolean,
): boolean =>
  has_precondition === HasPreconditionEnum.ALWAYS ||
  (has_precondition === HasPreconditionEnum.ONCE && !is_read)
    ? true
    : false;

/**
 * This function enrich a CreatedMessageWithoutContent with
 * service's details and message's subject.
 *
 * @param messageModel
 * @param serviceModel
 * @param blobService
 * @returns
 */
export const enrichServiceData =
  (
    context: Context,
    serviceModel: ServiceModel,
    redisClientFactory: RedisClientFactory,
    serviceCacheTtl: NonNegativeInteger,
    // eslint-disable-next-line max-params
  ) =>
  <M extends EnrichedMessageWithContent>(
    messages: readonly M[],
  ): // eslint-disable-next-line, @typescript-eslint/array-type
  TE.TaskEither<Error, readonly EnrichedMessage[]> =>
    pipe(
      messages,
      RA.map((m) => m.sender_service_id),
      RA.uniq(S.Eq),
      RA.map((serviceId: NonEmptyString) =>
        pipe(
          getOrCacheService(
            serviceId,
            serviceModel,
            redisClientFactory,
            serviceCacheTtl,
          ),
          TE.mapLeft((e) =>
            trackErrorAndContinue(
              context,
              e,
              "SERVICE",
              messages[0].fiscal_code,
              undefined,
              serviceId,
            ),
          ),
        ),
      ),
      RA.sequence(TE.ApplicativePar),
      TE.map((services) => new Map(services.map((s) => [s.serviceId, s]))),
      TE.map((serviceMap) =>
        messages.map((m) =>
          pipe(
            serviceMap.get(m.sender_service_id),
            (service) => ({
              message: {
                ...m,
                organization_fiscal_code: service.organizationFiscalCode,
                organization_name: service.organizationName,
                service_name: service.serviceName,
              },
              service,
            }),
            ({ message, service }) =>
              message.category?.tag !== TagEnumPayment.PAYMENT
                ? { ...message, category: message.category }
                : {
                    ...message,
                    category: {
                      rptId: `${
                        message.category.payeeFiscalCode ??
                        service.organizationFiscalCode
                      }${message.category.noticeNumber}`,
                      tag: TagEnumPayment.PAYMENT,
                    },
                  },
            (message) =>
              message.category?.tag === TagEnumPN.PN
                ? { ...message, has_precondition: true }
                : message,
          ),
        ),
      ),
    );

const getMessageStatusLastVersion = (
  messageStatusModel: MessageStatusExtendedQueryModel,
  messageIds: readonly NonEmptyString[],
): TE.TaskEither<Error, Record<NonEmptyString, RetrievedMessageStatus>> =>
  pipe(
    messageIds,
    (ids) => messageStatusModel.findAllVersionsByModelIdIn(ids),
    AI.fromAsyncIterator,
    AI.foldTaskEither(() => new Error(`Error retrieving data from cosmos.`)),
    TE.map(RA.flatten),
    TE.chainW((_) => {
      const lefts = RA.lefts(_);
      return lefts.length > 0
        ? TE.left<Error, readonly RetrievedMessageStatus[]>(
            new Error(`${lefts.length} service(s) with decoding errors found.`),
          )
        : TE.of<Error, readonly RetrievedMessageStatus[]>(RA.rights(_));
    }),
    TE.map(
      RA.reduce({} as Record<string, RetrievedMessageStatus>, (acc, val) => {
        if (!acc[val.messageId] || acc[val.messageId].version < val.version) {
          acc[val.messageId] = val;
        }
        return acc;
      }),
    ),
  );

/**
 * This function enrich a CreatedMessageWithoutContent with
 * message status details
 *
 * @param messageModel
 * @param serviceModel
 * @param blobService
 * @returns
 */
export const enrichMessagesStatus =
  (context: Context, messageStatusModel: MessageStatusExtendedQueryModel) =>
  (
    messages: readonly CreatedMessageWithoutContent[],
    // eslint-disable-next-line @typescript-eslint/array-type
  ): T.Task<E.Either<Error, CreatedMessageWithoutContentWithStatus>[]> =>
    pipe(
      messages.map((message) => message.id as NonEmptyString),
      (ids) => getMessageStatusLastVersion(messageStatusModel, ids),
      TE.mapLeft((error) => {
        context.log.error(`Cannot enrich message status | ${error}`);
        return messages.map(() => E.left(error));
      }),
      TE.map((lastMessageStatusPerMessage) =>
        messages.map((m) =>
          E.of({
            ...m,
            is_archived: lastMessageStatusPerMessage[m.id].isArchived,
            is_read: lastMessageStatusPerMessage[m.id].isRead,
          }),
        ),
      ),
      TE.toUnion,
    );

export interface IThirdPartyDataWithCategory {
  readonly category: Exclude<MessageCategory["tag"], TagEnumPayment>;
}
export type ThirdPartyDataWithCategoryFetcher = (
  serviceId: ServiceId,
) => IThirdPartyDataWithCategory;

export const getThirdPartyDataWithCategoryFetcher: (
  config: IConfig,
  telemetryClient: TelemetryClient,
) => ThirdPartyDataWithCategoryFetcher = (config) => (serviceId) =>
  pipe(
    serviceId,
    E.fromPredicate(
      (id) => id === config.PN_SERVICE_ID,
      (id) => Error(`Missing third-party service configuration for ${id}`),
    ),
    E.map(() => TagEnumPN.PN),
    E.mapLeft(() => TagEnumBase.GENERIC),
    E.toUnion,
    (category) => ({
      category,
    }),
  );
