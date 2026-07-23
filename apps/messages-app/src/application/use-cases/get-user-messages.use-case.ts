import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";

import { ServiceToRCConfigMap } from "../../adapters/inbound/config/config.js";
import {
  MessageContent,
  MessageContentRepository,
} from "../ports/message-content.js";
import {
  MessageMetadata,
  MessageMetadataRepository,
} from "../ports/message-metadata.js";
import {
  MessageStatus,
  MessageStatusRepository,
} from "../ports/message-status.js";
import {
  MessageCategory,
  PaginatedPublicMessagesCollection,
  PublicMessage,
} from "../ports/messages.js";
import {
  RCConfiguration,
  RCConfigurationRepository,
} from "../ports/rc-configuration.js";

export type GetMessagesByUserUseCase = UseCase<
  {
    archived: boolean;
    fiscalCode: string;
    maximumID?: string;
    minimumID?: string;
    pageSize: number;
  },
  PaginatedPublicMessagesCollection,
  GenericError | TooManyRequestsError
>;

/**
 * Derives the message category from its content, mirroring the content-based
 * enrichment performed in production (citizen-func `messageCategoryMappings`).
 *
 * The precedence is: EU Covid certificate, third-party data, payment data,
 * otherwise a generic message. Third-party messages are tagged as `PN` only
 * when they come from the configured PN service, otherwise they fall back to
 * `GENERIC`.
 */
const computeMessageCategory = (
  content: MessageContent,
  senderServiceId: string,
  pnServiceId: string,
): MessageCategory => {
  if (content.eu_covid_cert) {
    return { tag: "EU_COVID_CERT" };
  }

  if (content.third_party_data) {
    if (senderServiceId === pnServiceId) {
      return {
        has_attachments: content.third_party_data.has_attachments,
        has_remote_content: content.third_party_data.has_remote_content,
        id: content.third_party_data.id,
        original_receipt_date: content.third_party_data.original_receipt_date,
        original_sender: content.third_party_data.original_sender,
        summary: content.third_party_data.summary,
        tag: "PN",
      };
    }

    return { tag: "GENERIC" };
  }

  if (content.payment_data) {
    // In production the rptId is built by concatenating the payee fiscal code
    // (when present) with the notice number.
    return {
      rptId: `${content.payment_data.payee?.fiscal_code ?? ""}${content.payment_data.notice_number}`,
      tag: "PAYMENT",
    };
  }

  return { tag: "GENERIC" };
};

/**
 * getConfigurationIDFromMessageContent returns the correct remote content
 * configuration id.
 *
 * If the configurationID is not specified inside the message content, we need
 * to take it from the SERVICE_TO_RC_MAP.
 */
export const getConfigurationIDFromMessageContent = (
  configurationID: string | undefined,
  serviceID: string,
  serviceToRCMap: ServiceToRCConfigMap,
): string => {
  if (configurationID) return configurationID;

  const configruationIDFromMap = serviceToRCMap.get(serviceID);
  if (!configruationIDFromMap) {
    // This cse should never happen, if it happens then the
    // `ServiceToRCConfigMap` in the configuration is malformed.
    // We feel confident to throw an error.
    throw new GenericError(
      `Cannot find configurationID ${configurationID} either in the message content or in the configuration map`,
    );
  }

  return configruationIDFromMap;
};

/**
 * computeThirdPartyProperties returns the remote content properties.
 * If the message is not a remote content message, it will return undefined.
 */
export const computeThirdPartyProperties = (
  content: MessageContent,
  rcConfiguration: RCConfiguration,
  isRead: boolean,
): { has_attachments: boolean; has_precondition: boolean } | undefined => {
  // If the message is not a remote content message, return undefined.
  if (!content.third_party_data) return undefined;

  // Preconditions are taken from the message using the remote content
  // configuration as fallback.
  const preconditions = content.third_party_data.has_precondition
    ? content.third_party_data.has_precondition
    : rcConfiguration.hasPrecondition;

  // `has_precondition` is true if:
  //
  // - preconditions are "ALWAYS" (we always shows preconditions)
  // - preconditions are "ONCE" and the message is not read.
  //
  // Otherwise, `has_precontition` is false.
  const has_precondition =
    preconditions === "ALWAYS"
      ? true
      : preconditions === "NEVER"
        ? false
        : !isRead;

  return {
    has_attachments: content.third_party_data.has_attachments,
    has_precondition,
  };
};

/**
 * makeGetMessagesByUserUseCase returns a page of archived/non archived messages.
 * The page is formed as follows:
 *
 * {
 *   "items": The actual messages,
 *   "prev": The last message id of the previous page,
 *   "next": The first message id of the nexrt page,
 * }
 *
 * If the maximumID is not provided, the first page will be returned.
 */
export const makeGetMessagesByUserUseCase =
  (
    messageMetadataRepository: MessageMetadataRepository,
    messageStatusRepository: MessageStatusRepository,
    messageContentRepository: MessageContentRepository,
    remoteContentConfigurationRepository: RCConfigurationRepository,
    pnServiceId: string,
    serviceToRCMap: ServiceToRCConfigMap,
    logger: Logger,
  ): GetMessagesByUserUseCase =>
  async ({ archived, fiscalCode, maximumID, minimumID, pageSize }) => {
    // To fetch a page of messages, we need to retrieve:
    //
    // 1. Metadata
    // 2. Statuses
    // 3. Contents
    //
    // A message's archiving state is stored within its status. However, we cannot
    // fetch the statuses until we retrieve the metadata, as statuses are
    // partitioned by `messageId`.
    //
    // We initially fetch a larger batch of metadata to act as a buffer. We then
    // fetch the corresponding statuses until we collect enough archived or
    // non-archived messages (based on the `archived` input) to meet the `pageSize`.
    //
    // We use a buffer factor of 2: this heuristic assumes a roughly even split
    // between archived and non-archived messages, meaning that fetching twice the
    // `pageSize` is usually enough to fill a page in a single round-trip. If this
    // assumption fails, the `do/while` loop below simply performs additional
    // fetches. Thus, this factor affects only performance, never correctness.
    //
    // Restructuring the data model (e.g., partitioning the statuses by
    // `fiscalCode`) would improve both the performance and simplicity of this
    // operation.
    //
    // We collect up to `pageSize + 1` matching messages. The extra "sentinel"
    // message is never returned: its only purpose is to reliably detect whether
    // a further page exists. By explicitly fetching one matching message beyond
    // the page (scanning additional buffers if needed) we avoid the false
    // negative where a page fills exactly on the last item of a buffer and the
    // next match would only appear in a not-yet-fetched buffer.
    const selectedMessages: {
      metadata: MessageMetadata;
      status: MessageStatus;
    }[] = [];

    let endOfPageReached = false;
    let cursor = maximumID;

    // We use a do while because a single buffered fetch might not be enough to
    // fill the pageSize with archived/non archived messages.
    do {
      const metadata =
        await messageMetadataRepository.getMessagesMetadataByUser(
          fiscalCode,
          pageSize * 2, // Buffer.
          cursor,
          // `minimumID` is a fixed lower bound: it must be passed unchanged on
          // every iteration. Unlike the `cursor` (upper bound) it does not
          // advance, it only constrains the result to messages newer than it.
          minimumID,
        );

      if (metadata.isErr()) {
        return err(metadata.error);
      }

      const messageMetadataPage = metadata.value;

      if (messageMetadataPage.length === 0) {
        break;
      }

      // If we received fewer metadatas than the requested buffer, there are no
      // more messages to retrieve: we reached the end of the page. This also
      // avoids an extra empty round-trip to Cosmos just to discover the end.
      if (messageMetadataPage.length < pageSize * 2) {
        endOfPageReached = true;
      }

      const statuses =
        await messageStatusRepository.getLatestMessagesStatusByIds(
          messageMetadataPage.map((m) => m.id),
        );

      if (statuses.isErr()) {
        return err(statuses.error);
      }

      const metadataById = new Map(messageMetadataPage.map((m) => [m.id, m]));

      for (const status of statuses.value) {
        // We only keep the messages matching the requested archived flag.
        if (status.isArchived !== archived) {
          continue;
        }

        const metadataFromStatus = metadataById.get(status.messageId);
        if (metadataFromStatus) {
          selectedMessages.push({ metadata: metadataFromStatus, status });
        }

        // As soon as we collected one matching message more than a full page,
        // we know a next page exists: stop collecting.
        if (selectedMessages.length > pageSize) {
          break;
        }
      }

      // We only advance the cursor when we actually received some metadatas,
      // otherwise `.at(-1)` would be undefined.
      if (messageMetadataPage.length > 0) {
        cursor = messageMetadataPage.at(-1)?.id;
      }
    } while (selectedMessages.length <= pageSize && !endOfPageReached);

    // If we managed to collect the sentinel (a matching message beyond the
    // requested page), a next page exists. We drop it so the returned page
    // holds at most `pageSize` items.
    const hasMoreResults = selectedMessages.length > pageSize;
    if (hasMoreResults) {
      selectedMessages.pop();
    }

    // Now we have metadatas and statuses, we can get the message content.
    const messageContents =
      await messageContentRepository.getMessagesContentByIds(
        selectedMessages.map((s) => s.metadata.id),
      );

    if (messageContents.isErr()) {
      return err(messageContents.error);
    }

    const contentById = messageContents.value;
    const items: PublicMessage[] = [];

    // We use a Map in order to avoid calling multiple times the
    // `remoteContentConfigurationRepository.getConfigurationIDFromMessageContent`
    // using the same configurationID.
    const rcConfigurationCache = new Map<string, RCConfiguration>();
    for (const { metadata, status } of selectedMessages) {
      let thirdPartyProperties: ReturnType<typeof computeThirdPartyProperties>;

      const content = contentById.get(metadata.id);

      // Skip messages whose content is missing or invalid.
      if (!content || content.isErr()) {
        continue;
      }

      const messageContent = content.value;

      if (messageContent.third_party_data) {
        const configurationID = getConfigurationIDFromMessageContent(
          messageContent.third_party_data?.configuration_id,
          metadata.senderServiceId,
          serviceToRCMap,
        );

        const rcConfigurationFromMap =
          rcConfigurationCache.get(configurationID);

        if (!rcConfigurationFromMap) {
          const getRemoteContentConfigurationResponse =
            await remoteContentConfigurationRepository.getRemoteContentConfiguration(
              configurationID,
            );

          if (getRemoteContentConfigurationResponse.isErr()) {
            if (
              getRemoteContentConfigurationResponse.error instanceof
              NotFoundError
            ) {
              // If the remoteContentConfiguration was not found we simply skip
              // the message and track an event.
              logger.trackEvent({
                name: "GetMessagesByUserUseCase.getRemoteContentConfigurationResponse.failed.notFound",
                properties: {
                  messageID: metadata.id,
                  rcConfigurationID: configurationID,
                },
              });

              continue;
            }

            // Otherwise we simply return the error to the caller.
            return err(getRemoteContentConfigurationResponse.error);
          }

          rcConfigurationCache.set(
            configurationID,
            getRemoteContentConfigurationResponse.value,
          );
        }

        thirdPartyProperties = computeThirdPartyProperties(
          messageContent,
          rcConfigurationCache.get(configurationID)!,
          status.isRead,
        );
      }

      items.push({
        // TODO: Mocked service information. Enrich with real service data
        category: computeMessageCategory(
          content.value,
          metadata.senderServiceId,
          pnServiceId,
        ),
        created_at: metadata.createdAt,
        fiscal_code: metadata.fiscalCode,
        ...thirdPartyProperties,
        id: metadata.id,
        is_archived: status.isArchived,
        is_read: status.isRead,
        message_title: content.value.subject,
        organization_fiscal_code: "00000000000",
        organization_name: "Mocked organization name",
        sender_service_id: metadata.senderServiceId,
        service_name: "Mocked service name",
        status: status.status,
        time_to_live: metadata.timeToLiveSeconds,
      });
    }

    // The messages are ordered by id in descending order (newest first), so:
    //
    // - `prev` is the id of the first (newest) message of the page and it is
    //   used to navigate to the previous (more recent) page.
    // - `next` is the id of the last (oldest) message of the page and it is set
    //   only when there are more messages to retrieve.
    return ok({
      items,
      next: hasMoreResults ? selectedMessages.at(-1)?.metadata.id : undefined, // 1
      prev: items.at(0)?.id,
    });
  };
