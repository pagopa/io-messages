import type {
  GenericError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";

import { err, ok } from "neverthrow";

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
    pnServiceId: string,
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

    for (const { metadata, status } of selectedMessages) {
      const content = contentById.get(metadata.id);

      // Skip messages whose content is missing or invalid.
      if (!content || content.isErr()) {
        continue;
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

        has_attachments:
          content.value.third_party_data?.has_attachments ?? false,
        has_precondition: false, // TODO: Compute from RC configuration.
        id: metadata.id,
        is_archived: status.isArchived,
        is_read: status.isRead,
        message_title: content.value.subject,
        // (organization_fiscal_code, organization_name, service_name).
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
      next: hasMoreResults ? items.at(-1)?.id : undefined,
      prev: items.at(0)?.id,
    });
  };
