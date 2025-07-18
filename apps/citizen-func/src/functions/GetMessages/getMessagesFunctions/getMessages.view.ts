import { TagEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryBase";
import { TagEnum as TagEnumPayment } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryPayment";
import { defaultPageSize } from "@pagopa/io-functions-commons/dist/src/models/message";
import { RetrievedMessageView } from "@pagopa/io-functions-commons/dist/src/models/message_view";
import { flattenAsyncIterable } from "@pagopa/io-functions-commons/dist/src/utils/async";
import {
  CosmosErrors,
  toCosmosErrorResponse,
} from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import { toPageResults } from "@pagopa/io-functions-commons/dist/src/utils/paging";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/lib/Option";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";

import { HasPreconditionEnum } from "../../../generated/definitions/HasPrecondition";
import { MessageViewExtendedQueryModel } from "../../../model/message_view_query";
import * as AI from "../../../utils/AsyncIterableTask";
import {
  ThirdPartyDataWithCategoryFetcher,
  computeFlagFromHasPrecondition,
} from "../../../utils/messages";
import RCConfigurationUtility from "../../../utils/remoteContentConfig";
import { IGetMessagesFunction, IPageResult } from "./getMessages.selector";
import { EnrichedMessageWithContent, InternalMessageCategory } from "./models";

/**
 * Map `RetrievedMessageView` to `EnrichedMessageWithContent`
 */
export const toEnrichedMessageWithContent =
  (categoryFetcher: ThirdPartyDataWithCategoryFetcher) =>
  (
    item: RetrievedMessageView,
    hasPrecondition: boolean,
  ): EnrichedMessageWithContent => ({
    category: toCategory(categoryFetcher)(item),
    created_at: item.createdAt,
    fiscal_code: item.fiscalCode,
    has_attachments: item.components.thirdParty.has
      ? item.components.thirdParty.has_attachments
      : false,
    has_precondition: hasPrecondition ?? false,
    has_remote_content: item.components.thirdParty.has
      ? item.components.thirdParty.has_remote_content
      : false,
    id: item.id,
    is_archived: item.status.archived,
    is_read: item.status.read,
    message_title: item.messageTitle,
    sender_service_id: item.senderServiceId,
    time_to_live: item.timeToLive,
  });

export const getHasPreconditionFlagForMessagesFromView = (
  retrievedMessagesFromView: readonly RetrievedMessageView[],
  categoryFetcher: ThirdPartyDataWithCategoryFetcher,
  rcConfigurationUtility: RCConfigurationUtility,
): TE.TaskEither<Error, readonly EnrichedMessageWithContent[]> =>
  pipe(
    retrievedMessagesFromView,
    RA.map((message) =>
      pipe(
        message.components.thirdParty,
        O.fromPredicate((thirdParty) => thirdParty.has === true),
        O.map((thirdParty) =>
          pipe(
            thirdParty.has
              ? thirdParty.has_precondition
              : HasPreconditionEnum.NEVER, // ugly, but O.fromPredicate cannot infer disjointed unions
            O.fromNullable,
            O.fold(
              () =>
                pipe(
                  rcConfigurationUtility.getOrCacheRCConfigurationWithFallback(
                    message.senderServiceId,
                    thirdParty.has ? thirdParty.configuration_id : undefined,
                  ),
                  TE.map((serviceConfig) => serviceConfig.hasPrecondition),
                ),
              (hasPrecondition) => TE.of(hasPrecondition),
            ),
            TE.map((hasPreconditionEnum) =>
              pipe(
                computeFlagFromHasPrecondition(
                  hasPreconditionEnum,
                  message.status.read,
                ),
                (hasPrecondition) =>
                  toEnrichedMessageWithContent(categoryFetcher)(
                    message,
                    hasPrecondition,
                  ),
              ),
            ),
          ),
        ),
        O.getOrElse(() =>
          TE.of(toEnrichedMessageWithContent(categoryFetcher)(message, false)),
        ),
      ),
    ),
    TE.sequenceArray,
  );

export const getMessagesFromView =
  (
    messageViewModel: MessageViewExtendedQueryModel,
    rcConfigurationUtility: RCConfigurationUtility,
    categoryFetcher: ThirdPartyDataWithCategoryFetcher,
  ): IGetMessagesFunction =>
  ({
    context,
    fiscalCode,
    maximumId,
    minimumId,
    pageSize = defaultPageSize,
    shouldGetArchivedMessages,
  }): TE.TaskEither<
    CosmosErrors | Error,
    IPageResult<EnrichedMessageWithContent>
  > =>
    pipe(
      messageViewModel.queryPage(fiscalCode, maximumId, minimumId, pageSize),

      TE.mapLeft((err) => {
        context.log.error(
          `getMessagesFromView|Error building queryPage iterator`,
        );
        return err;
      }),
      TE.chainW(
        flow(
          AI.fromAsyncIterable,
          AI.map(RA.rights),
          AI.map(
            RA.filter(
              (message) =>
                message.status.archived === shouldGetArchivedMessages,
            ),
          ),
          AI.mapIterable(flattenAsyncIterable),
          AI.toPageArray(toCosmosErrorResponse, pageSize),
          TE.map(({ hasMoreResults, results }) =>
            toPageResults(results, hasMoreResults),
          ),
          TE.chainW((pageResult) =>
            pipe(
              getHasPreconditionFlagForMessagesFromView(
                pageResult.items as readonly RetrievedMessageView[],
                categoryFetcher,
                rcConfigurationUtility,
              ),
              TE.map((items) => ({
                ...pageResult,
                items,
              })),
            ),
          ),
          TE.mapLeft((err) => {
            context.log.error(
              `getMessagesFromView|Error retrieving page data from cosmos|${JSON.stringify(
                err,
              )}`,
            );
            return err;
          }),
        ),
      ),
    );

/**
 * Map components to `InternalMessageCategory`
 */
const toCategory =
  (categoryFetcher: ThirdPartyDataWithCategoryFetcher) =>
  ({
    components,
    senderServiceId,
  }: RetrievedMessageView): InternalMessageCategory =>
    components.euCovidCert.has
      ? { tag: TagEnum.EU_COVID_CERT }
      : components.legalData.has
        ? { tag: TagEnum.LEGAL_MESSAGE }
        : components.thirdParty.has
          ? {
              has_attachments: components.thirdParty.has_attachments,
              has_remote_content: components.thirdParty.has_remote_content,
              id: components.thirdParty.id,
              original_receipt_date:
                components.thirdParty.original_receipt_date,
              original_sender: components.thirdParty.original_sender,
              summary: components.thirdParty.summary,
              tag: categoryFetcher(senderServiceId).category,
            }
          : components.payment.has
            ? {
                // Ignore ts error since we've already checked payment.has to be true
                noticeNumber: components.payment
                  .notice_number as unknown as NonEmptyString,
                tag: TagEnumPayment.PAYMENT,
              }
            : { tag: TagEnum.GENERIC };
