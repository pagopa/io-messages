import { InvocationContext } from "@azure/functions";
import { Change_typeEnum as ArchivingChangeType } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/MessageStatusArchivingChange";
import { Change_typeEnum as BulkChangeType } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/MessageStatusBulkChange";
import { MessageStatusChange } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/MessageStatusChange";
import { Change_typeEnum as ReadingChangeType } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/MessageStatusReadingChange";
import { MessageStatusWithAttributes as MessageStatusApi } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/MessageStatusWithAttributes";
import {
  MessageStatus,
  MessageStatusModel,
} from "@pagopa/io-functions-commons/dist/src/models/message_status";
import { wrapHandlerV4 } from "@pagopa/io-functions-commons/dist/src/utils/azure-functions-v4-express-adapter";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { FiscalCodeMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/fiscalcode";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  IResponseErrorQuery,
  ResponseErrorQuery,
} from "@pagopa/io-functions-commons/dist/src/utils/response";
import {
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseErrorForbiddenNotAuthorized,
  ResponseErrorNotFound,
  ResponseSuccessJson,
} from "@pagopa/ts-commons/lib/responses";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";

const exaustiveCheck = (x: never): never => {
  throw new Error(`unexpected value ${x}`);
};

const mapChange = (
  change: MessageStatusChange,
): Partial<Pick<MessageStatus, "isArchived" | "isRead">> => {
  switch (change.change_type) {
    case ReadingChangeType.reading:
      return { isRead: change.is_read };
    case ArchivingChangeType.archiving:
      return { isArchived: change.is_archived };
    case BulkChangeType.bulk:
      return { isArchived: change.is_archived, isRead: change.is_read };
    default:
      return exaustiveCheck(change);
  }
};

/**
 * Type of a UpsertMessageStatus handler.
 *
 * UpsertMessageStatus expects a FiscalCode and a Message ID as input
 * and returns a MessageStatus as output or a Not Found or Validation
 * errors.
 */
type IUpsertMessageStatusHandler = (
  context: InvocationContext,
  fiscalCode: FiscalCode,
  messageId: NonEmptyString,
  change: MessageStatusChange,
) => Promise<
  | IResponseErrorForbiddenNotAuthorized
  | IResponseErrorNotFound
  | IResponseErrorQuery
  | IResponseSuccessJson<MessageStatusApi>
>;

/**
 * Handles requests for upserting a message status for a recipient.
 */
export const UpsertMessageStatusHandler =
  (messageStatusModel: MessageStatusModel): IUpsertMessageStatusHandler =>
  async (_context, fiscalCode, messageId, change) =>
    pipe(
      messageStatusModel.findLastVersionByModelId([messageId]),
      TE.mapLeft((err) => ResponseErrorQuery("findLastVersionByModelId", err)),
      TE.chainW(
        TE.fromOption(() =>
          ResponseErrorNotFound(
            `Cannot found message status`,
            `Cannot found message status for message ${messageId}`,
          ),
        ),
      ),
      TE.chainW(
        TE.fromPredicate(
          (messageStatus) => messageStatus.fiscalCode === fiscalCode,
          () => ResponseErrorForbiddenNotAuthorized,
        ),
      ),
      TE.map((messageStatus) => ({
        ...messageStatus,
        ...mapChange(change),
        fiscalCode,
        kind: "INewMessageStatus" as const,
        updatedAt: new Date(),
      })),
      TE.chainW((newStatus) =>
        pipe(
          messageStatusModel.upsert(newStatus),
          TE.mapLeft((err) => ResponseErrorQuery("on upsert", err)),
        ),
      ),
      TE.map((res) => ({
        is_archived: res.isArchived,
        is_read: res.isRead,
        status: res.status,
        updated_at: res.updatedAt,
        version: res.version,
      })),
      TE.map((res) => ResponseSuccessJson(res)),
      TE.toUnion,
    )();

/**
 * Wraps an UpsertMessageStatus handler for Azure Functions v4.
 */
export function UpsertMessageStatus(messageStatusModel: MessageStatusModel) {
  const handler = UpsertMessageStatusHandler(messageStatusModel);
  const middlewares = [
    ContextMiddleware(),
    FiscalCodeMiddleware,
    RequiredParamMiddleware("id", NonEmptyString),
    RequiredBodyPayloadMiddleware(MessageStatusChange),
  ] as const;
  return wrapHandlerV4(middlewares, handler);
}
