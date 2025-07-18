/* eslint-disable max-lines-per-function */
import { Context } from "@azure/functions";
import { MessageContent } from "@pagopa/io-backend-notifications-sdk/MessageContent";
import { ExternalCreatedMessageWithContent } from "@pagopa/io-functions-commons/dist/generated/definitions/ExternalCreatedMessageWithContent";
import { ExternalCreatedMessageWithoutContent } from "@pagopa/io-functions-commons/dist/generated/definitions/ExternalCreatedMessageWithoutContent";
import { ExternalMessageResponseWithContent } from "@pagopa/io-functions-commons/dist/generated/definitions/ExternalMessageResponseWithContent";
import { ExternalMessageResponseWithoutContent } from "@pagopa/io-functions-commons/dist/generated/definitions/ExternalMessageResponseWithoutContent";
import { NotRejectedMessageStatusValueEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/NotRejectedMessageStatusValue";
import { PaymentDataWithRequiredPayee } from "@pagopa/io-functions-commons/dist/generated/definitions/PaymentDataWithRequiredPayee";
import { PaymentStatus } from "@pagopa/io-functions-commons/dist/generated/definitions/PaymentStatus";
import {
  ReadStatus,
  ReadStatusEnum,
} from "@pagopa/io-functions-commons/dist/generated/definitions/ReadStatus";
import {
  MessageModel,
  RetrievedMessage,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  MessageStatusModel,
  RetrievedMessageStatus,
} from "@pagopa/io-functions-commons/dist/src/models/message_status";
import { NotificationModel } from "@pagopa/io-functions-commons/dist/src/models/notification";
import { NotificationStatusModel } from "@pagopa/io-functions-commons/dist/src/models/notification_status";
import { ServiceModel } from "@pagopa/io-functions-commons/dist/src/models/service";
import {
  getMessageNotificationStatuses,
  retrievedMessageToPublic,
} from "@pagopa/io-functions-commons/dist/src/utils/messages";
import {
  AzureApiAuthMiddleware,
  IAzureApiAuthorization,
  UserGroup,
} from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_api_auth";
import {
  AzureUserAttributesMiddleware,
  IAzureUserAttributes,
} from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_user_attributes";
import {
  ClientIp,
  ClientIpMiddleware,
} from "@pagopa/io-functions-commons/dist/src/utils/middlewares/client_ip_middleware";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { FiscalCodeMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/fiscalcode";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler,
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorQuery,
  ResponseErrorQuery,
} from "@pagopa/io-functions-commons/dist/src/utils/response";
import {
  checkSourceIpForHandler,
  clientIPAndCidrTuple as ipTuple,
} from "@pagopa/io-functions-commons/dist/src/utils/source_ip_check";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import {
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseErrorValidation,
  IResponseSuccessJson,
  ResponseErrorForbiddenNotAuthorized,
  ResponseErrorInternal,
  ResponseErrorNotFound,
  ResponseErrorValidation,
  ResponseSuccessJson,
  getResponseErrorForbiddenNotAuthorized,
} from "@pagopa/ts-commons/lib/responses";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { BlobService } from "azure-storage";
import * as express from "express";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import * as B from "fp-ts/lib/boolean";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { match } from "ts-pattern";

import { PagoPaEcommerceClient } from "../../clients/pagopa-ecommerce";
import { FeatureLevelTypeEnum } from "../../generated/definitions/FeatureLevelType";
import { LegalData } from "../../generated/definitions/LegalData";
import { PaymentStatusEnum } from "../../generated/definitions/PaymentStatus";
import {
  FaultCodeCategoryEnum,
  PaymentDuplicatedStatusFaultPaymentProblemJson,
} from "../../generated/pagopa-ecommerce/PaymentDuplicatedStatusFaultPaymentProblemJson";
import { IConfig } from "../../utils/config";
import { errorsToError } from "../../utils/responses";
import { MessageReadStatusAuth } from "./userPreferenceChecker/messageReadStatusAuth";

/**
 * Converts a retrieved message to a message that can be shared via API
 */
export const retrievedMessageToExternal = (
  retrievedMessage: RetrievedMessage,
): ExternalCreatedMessageWithoutContent => ({
  ...retrievedMessageToPublic(retrievedMessage),
  feature_level_type: retrievedMessage.featureLevelType,
});

/**
 * Type of a GetMessage handler.
 *
 * GetMessage expects a FiscalCode and a Message ID as input
 * and returns a Message as output or a Not Found or Validation
 * errors.
 */
type IGetMessageHandler = (
  context: Context,
  auth: IAzureApiAuthorization,
  clientIp: ClientIp,
  attrs: IAzureUserAttributes,
  fiscalCode: FiscalCode,
  messageId: string,
) => Promise<
  | IResponseErrorForbiddenNotAuthorized
  | IResponseErrorInternal
  | IResponseErrorNotFound
  | IResponseErrorQuery
  | IResponseErrorValidation
  | IResponseSuccessJson<
      ExternalMessageResponseWithContent | ExternalMessageResponseWithoutContent
    >
>;

const LegalMessagePattern = t.type({ legal_data: LegalData });
type LegalMessagePattern = t.TypeOf<typeof LegalMessagePattern>;

/**
 * Checks whether the client service can read advanced message info (read_status and payment_Status)
 */
export const canReadAdvancedMessageInfo = (
  message:
    | ExternalCreatedMessageWithContent
    | ExternalCreatedMessageWithoutContent,
  messageIsPending: boolean,
  authGroups: IAzureApiAuthorization["groups"],
): boolean =>
  !messageIsPending &&
  message.feature_level_type === FeatureLevelTypeEnum.ADVANCED &&
  authGroups.has(UserGroup.ApiMessageReadAdvanced);

/**
 * Return a ReadStatusEnum
 *
 * @param maybeMessageStatus an Option of MessageStatus
 * @returns READ if message status exists and isRead is set to true, UNREAD otherwise
 */
export const getReadStatusForService = (
  maybeMessageStatus: O.Option<RetrievedMessageStatus>,
): ReadStatus =>
  pipe(
    maybeMessageStatus,
    O.map((messageStatus) => messageStatus.isRead),
    O.map(
      B.fold(
        () => ReadStatusEnum.UNREAD,
        () => ReadStatusEnum.READ,
      ),
    ),
    O.getOrElse(() => ReadStatusEnum.UNREAD),
    (x) => x,
  );

const mapPaymentStatus = ({
  paid,
}: {
  readonly paid: boolean;
}): PaymentStatus =>
  paid ? PaymentStatusEnum.PAID : PaymentStatusEnum.NOT_PAID;

const WithPayment = t.type({
  message: t.type({
    content: t.type({ payment_data: PaymentDataWithRequiredPayee }),
  }),
});
const WithStatusProcessed = t.type({
  status: t.literal(NotRejectedMessageStatusValueEnum.PROCESSED),
});
const eligibleForPaymentStatus =
  (FF_PAYMENT_STATUS_ENABLED: boolean) =>
  (
    messageWithContent: unknown,
  ): E.Either<Error | t.Errors, PaymentDataWithRequiredPayee> =>
    pipe(
      messageWithContent,
      E.right,
      E.chainFirst(
        E.fromPredicate(
          () => FF_PAYMENT_STATUS_ENABLED,
          () => Error("Feature Flag disabled"),
        ),
      ),
      E.chainW((mwc) =>
        pipe(
          WithStatusProcessed.decode(mwc),
          E.mapLeft(() => new Error("Message status is not processed")),
        ),
      ),
      E.chainW((mwc) =>
        pipe(
          WithPayment.decode(mwc),
          E.mapLeft(
            () => new Error("Message does not contain required payment data"),
          ),
        ),
      ),
      E.map((mwc) => mwc.message.content.payment_data),
    );

const decorateWithPaymentStatus = <
  T extends {
    readonly message: { readonly content: MessageContent | undefined };
  },
>(
  FF_PAYMENT_STATUS_ENABLED: boolean,
  pagoPaEcommerceClient: PagoPaEcommerceClient,
  messageWithContent: T,
): TE.TaskEither<IResponseErrorInternal, T> =>
  pipe(
    messageWithContent,
    eligibleForPaymentStatus(FF_PAYMENT_STATUS_ENABLED),
    TE.fromEither,
    TE.foldW(
      () => TE.right({ ...messageWithContent, payment_status: undefined }),
      (paymentData) => {
        const rptId = `${paymentData.payee.fiscal_code}${paymentData.notice_number}`;
        return pipe(
          TE.tryCatch(
            () =>
              pagoPaEcommerceClient.getPaymentRequestInfo({ rpt_id: rptId }),
            E.toError,
          ),
          TE.map(E.mapLeft(errorsToError)),
          TE.chain(TE.fromEither),
          TE.chain((response) =>
            match(response)
              .with({ status: 200 }, () => TE.right({ paid: false }))
              .with({ status: 404 }, () => TE.right({ paid: false }))
              .with({ status: 409 }, (conflict) => {
                if (
                  PaymentDuplicatedStatusFaultPaymentProblemJson.is(
                    conflict.value,
                  )
                ) {
                  return TE.right({
                    paid:
                      conflict.value.faultCodeCategory ===
                      FaultCodeCategoryEnum.PAYMENT_DUPLICATED,
                  });
                }
                return TE.right({ paid: false });
              })
              .otherwise((error) =>
                TE.left(
                  new Error(
                    `Failed to fetch payment status from PagoPa ecommerce api: status: ${error.status}, ${error.value?.title}`,
                  ),
                ),
              ),
          ),
          TE.mapLeft((error) =>
            ResponseErrorInternal(
              `Error retrieving Payment Status: ${error.message}`,
            ),
          ),
          TE.map(mapPaymentStatus),
          TE.map((paymentStatus) => ({
            ...messageWithContent,
            payment_status: paymentStatus,
          })),
        );
      },
    ),
  );

/**
 * Handles requests for getting a single message for a recipient.
 */
// eslint-disable-next-line max-params, max-lines-per-function
export const GetMessageHandler =
  (
    FF_PAYMENT_STATUS_ENABLED: boolean,
    messageModel: MessageModel,
    messageStatusModel: MessageStatusModel,
    notificationModel: NotificationModel,
    notificationStatusModel: NotificationStatusModel,
    blobService: BlobService,
    canAccessMessageReadStatus: MessageReadStatusAuth,
    pagoPaEcommerceClient: PagoPaEcommerceClient,
  ): IGetMessageHandler =>
  // eslint-disable-next-line max-params
  async (
    context,
    auth,
    __,
    userAttributes,
    fiscalCode,
    messageId,
    // eslint-disable-next-line max-params
  ): ReturnType<IGetMessageHandler> => {
    const errorOrMessageId = NonEmptyString.decode(messageId);

    if (E.isLeft(errorOrMessageId)) {
      return ResponseErrorValidation(
        "Invalid messageId",
        readableReport(errorOrMessageId.left),
      );
    }
    const errorOrMaybeDocument = await messageModel.findMessageForRecipient(
      fiscalCode,
      errorOrMessageId.right,
    )();

    if (E.isLeft(errorOrMaybeDocument)) {
      // the query failed
      return ResponseErrorQuery(
        "Error while retrieving the message",
        errorOrMaybeDocument.left,
      );
    }

    const maybeDocument = errorOrMaybeDocument.right;
    if (O.isNone(maybeDocument)) {
      // the document does not exist
      return ResponseErrorNotFound(
        "Message not found",
        "The message that you requested was not found in the system.",
      );
    }

    const retrievedMessage = maybeDocument.value;

    const isUserAllowedForLegalMessages =
      [...auth.groups].indexOf(UserGroup.ApiLegalMessageRead) >= 0;
    // the service is allowed to see the message when he is the sender of the message
    const isUserAllowed =
      retrievedMessage.senderServiceId === userAttributes.service.serviceId ||
      isUserAllowedForLegalMessages;

    if (!isUserAllowed) {
      // the user is not allowed to see the message
      return getResponseErrorForbiddenNotAuthorized(
        "You are not allowed to read this message, you can only read messages that you have sent",
      );
    }

    // fetch the content of the message from the blob storage
    const errorOrMaybeContent = await pipe(
      messageModel.getContentFromBlob(blobService, retrievedMessage.id),
      TE.mapLeft((error) => {
        context.log.error(`GetMessageHandler|${JSON.stringify(error)}`);
        return ResponseErrorInternal(`${error.name}: ${error.message}`);
      }),
      TE.chainW(
        O.fold(
          () =>
            isUserAllowedForLegalMessages
              ? TE.left(
                  ResponseErrorNotFound(
                    "Not Found",
                    "Message Content not found",
                  ),
                )
              : TE.of(O.none),
          (messageContent) =>
            pipe(
              messageContent,
              LegalMessagePattern.decode,
              TE.fromEither,
              TE.map(() => O.some(messageContent)),
              TE.orElse(() =>
                !isUserAllowedForLegalMessages
                  ? TE.of(O.some(messageContent))
                  : TE.left<
                      | IResponseErrorForbiddenNotAuthorized
                      | IResponseErrorNotFound,
                      O.Option<MessageContent>
                    >(ResponseErrorForbiddenNotAuthorized),
              ),
            ),
        ),
      ),
    )();

    if (E.isLeft(errorOrMaybeContent)) {
      context.log.error(
        `GetMessageHandler|${JSON.stringify(errorOrMaybeContent.left)}`,
      );
      return errorOrMaybeContent.left;
    }

    const content = O.toUndefined(errorOrMaybeContent.right);

    const message = {
      content,
      ...retrievedMessageToExternal(retrievedMessage),
    };

    const errorOrNotificationStatuses = await getMessageNotificationStatuses(
      notificationModel,
      notificationStatusModel,
      retrievedMessage.id,
    )();

    if (E.isLeft(errorOrNotificationStatuses)) {
      return ResponseErrorInternal(
        `Error retrieving NotificationStatus: ${errorOrNotificationStatuses.left.name}|${errorOrNotificationStatuses.left.message}`,
      );
    }
    const notificationStatuses = errorOrNotificationStatuses.right;

    const errorOrMaybeMessageStatus =
      await messageStatusModel.findLastVersionByModelId([
        retrievedMessage.id,
      ])();

    if (E.isLeft(errorOrMaybeMessageStatus)) {
      return ResponseErrorInternal(
        `Error retrieving MessageStatus: ${JSON.stringify(
          errorOrMaybeMessageStatus.left,
        )}`,
      );
    }
    const maybeMessageStatus = errorOrMaybeMessageStatus.right;

    return pipe(
      {
        message,
        notification: pipe(notificationStatuses, O.toUndefined),
        // we do not return the status date-time
        status: pipe(
          maybeMessageStatus,
          O.map((messageStatus) => messageStatus.status),
          // when the message has been received but a MessageStatus
          // does not exist yet, the message is considered to be
          // in the ACCEPTED state (not yet visible in the user's inbox)
          O.getOrElseW(() => NotRejectedMessageStatusValueEnum.ACCEPTED),
        ),
      },
      // Enrich message info with advanced properties if user is allowed to read them
      (messageWithoutAdvancedProperties) =>
        pipe(
          canReadAdvancedMessageInfo(
            message,
            retrievedMessage.isPending ?? true,
            auth.groups,
          ),
          B.foldW(
            () =>
              TE.of({
                ...messageWithoutAdvancedProperties,
                read_status: ReadStatusEnum.UNAVAILABLE,
              }),
            () =>
              pipe(
                canAccessMessageReadStatus(auth.subscriptionId, fiscalCode),
                TE.map((serviceCanReadMessageReadStatus) => ({
                  ...messageWithoutAdvancedProperties,
                  read_status: B.fold(
                    () => ReadStatusEnum.UNAVAILABLE,
                    () => getReadStatusForService(maybeMessageStatus),
                  )(serviceCanReadMessageReadStatus),
                })),
                TE.mapLeft(() =>
                  ResponseErrorInternal(
                    `Error retrieving information about read status preferences`,
                  ),
                ),
                TE.chain((messageWithAdvanceProperties) =>
                  decorateWithPaymentStatus(
                    FF_PAYMENT_STATUS_ENABLED,
                    pagoPaEcommerceClient,
                    messageWithAdvanceProperties,
                  ),
                ),
              ),
          ),
          TE.map((externalResponse) => {
            if (
              canReadAdvancedMessageInfo(
                message,
                retrievedMessage.isPending ?? true,
                auth.groups,
              )
            )
              return externalResponse;
            else {
              // remove read_status in case the caller has no permission to
              // see it
              //eslint-disable-next-line @typescript-eslint/no-unused-vars
              return (({ read_status, ...rest }) => rest)(externalResponse);
            }
          }),
          TE.map(ResponseSuccessJson),
          TE.toUnion,
        ),
    )();
  };

/**
 * Wraps a GetMessage handler inside an Express request handler.
 */
// eslint-disable-next-line max-params
export function GetMessage(
  { FF_PAYMENT_STATUS_ENABLED }: IConfig,
  serviceModel: ServiceModel,
  messageModel: MessageModel,
  messageStatusModel: MessageStatusModel,
  notificationModel: NotificationModel,
  notificationStatusModel: NotificationStatusModel,
  blobService: BlobService,
  canAccessMessageReadStatus: MessageReadStatusAuth,
  pagoPaEcommerceClient: PagoPaEcommerceClient,
): express.RequestHandler {
  const handler = GetMessageHandler(
    FF_PAYMENT_STATUS_ENABLED,
    messageModel,
    messageStatusModel,
    notificationModel,
    notificationStatusModel,
    blobService,
    canAccessMessageReadStatus,
    pagoPaEcommerceClient,
  );
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    AzureApiAuthMiddleware(
      new Set([UserGroup.ApiMessageRead, UserGroup.ApiLegalMessageRead]),
    ),
    ClientIpMiddleware,
    AzureUserAttributesMiddleware(serviceModel),
    FiscalCodeMiddleware,
    RequiredParamMiddleware("id", NonEmptyString),
  );
  return wrapRequestHandler(
    middlewaresWrap(
      // eslint-disable-next-line max-params, @typescript-eslint/no-unused-vars
      checkSourceIpForHandler(handler, (_, __, c, u, ___, ____) =>
        ipTuple(c, u),
      ),
    ),
  );
}
