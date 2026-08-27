import { GenericError, NotFoundError } from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MessageContentRepository } from "../../ports/message-content.js";
import { MessageMetadataRepository } from "../../ports/message-metadata.js";
import { MessageStatusRepository } from "../../ports/message-status.js";
import { ServicesCmsRepository } from "../../ports/services-cms.js";
import { makeGetMessageUseCase } from "../get-message.use-case.js";

const messageId = "01JAQ4HYBR5JZCS6K0DT7M1EV8";
const fiscalCode = "RSSMRA80A01H501U";
const serviceId = "01JHYBR5JZCS6K0DT7M1EV8N2F";

const metadataRepository = {
  getMessageMetadataByFiscalCodeAndId: vi.fn().mockResolvedValue(
    ok({
      createdAt: "2023-01-01T00:00:00.000Z",
      featureLevelType: "STANDARD",
      fiscalCode,
      id: messageId,
      indexedId: messageId,
      isPending: false,
      senderServiceId: serviceId,
      senderUserId: "sender",
      timeToLiveSeconds: 3600,
    }),
  ),
} as unknown as MessageMetadataRepository;

const statusRepository = {
  getLatestMessageStatusById: vi.fn().mockResolvedValue(
    ok({
      id: `${messageId}-0000000000000000`,
      isArchived: false,
      isRead: true,
      messageId,
      status: "PROCESSED",
      updatedAt: "2023-01-01T00:00:00.000Z",
      version: 0,
    }),
  ),
} as unknown as MessageStatusRepository;

const contentRepository = {
  getMessageContentById: vi.fn().mockResolvedValue(
    ok({
      markdown: "a".repeat(80),
      subject: "a valid subject",
    }),
  ),
} as unknown as MessageContentRepository;

const servicesRepository = {
  getServicesCmsDetailsByServiceIds: vi.fn().mockResolvedValue(
    ok(
      new Map([
        [
          serviceId,
          ok({
            authorized_cidrs: [],
            authorized_recipients: [],
            description: "description",
            id: serviceId,
            last_update: "2024-01-01T00:00:00.000Z",
            max_allowed_payment_amount: 1000,
            metadata: { scope: "NATIONAL" },
            name: "Service name",
            organization: {
              fiscal_code: "01234567890",
              name: "Organization name",
            },
            require_secure_channel: false,
            status: { value: "published" },
          }),
        ],
      ]),
    ),
  ),
} as unknown as ServicesCmsRepository;

const serviceToRcMap = new Map<string, string>();

const getMessage = makeGetMessageUseCase(
  metadataRepository,
  statusRepository,
  contentRepository,
  servicesRepository,
  "pn-service-id",
  serviceToRcMap,
);

beforeEach(() => {
  vi.clearAllMocks();
  serviceToRcMap.clear();
});

describe("makeGetMessageUseCase - retrieval", () => {
  it("returns metadata and content without public enrichment", async () => {
    const result = await getMessage({
      fiscalCode,
      messageId,
      publicMessage: false,
    });

    expect(result._unsafeUnwrap()).toEqual({
      message: {
        content: {
          markdown: "a".repeat(80),
          subject: "a valid subject",
        },
        created_at: "2023-01-01T00:00:00.000Z",
        fiscal_code: fiscalCode,
        id: messageId,
        sender_service_id: serviceId,
        time_to_live: 3600,
      },
    });
    expect(statusRepository.getLatestMessageStatusById).not.toHaveBeenCalled();
    expect(
      servicesRepository.getServicesCmsDetailsByServiceIds,
    ).not.toHaveBeenCalled();
  });

  it("adds status and service fields when public enrichment is requested", async () => {
    const result = await getMessage({
      fiscalCode,
      messageId,
      publicMessage: true,
    });

    expect(result._unsafeUnwrap().message).toMatchObject({
      category: { tag: "GENERIC" },
      is_archived: false,
      is_read: true,
      message_title: "a valid subject",
      organization_fiscal_code: "01234567890",
      organization_name: "Organization name",
      service_name: "Service name",
    });
  });

  it("propagates a missing recipient-scoped metadata error", async () => {
    const notFound = new NotFoundError("message", "message not found");
    vi.mocked(
      metadataRepository.getMessageMetadataByFiscalCodeAndId,
    ).mockResolvedValueOnce(err(notFound));

    const result = await getMessage({
      fiscalCode,
      messageId,
      publicMessage: false,
    });

    expect(result._unsafeUnwrapErr()).toBe(notFound);
  });

  it("propagates a missing message content error", async () => {
    const notFound = new NotFoundError("content", "content not found");
    vi.mocked(contentRepository.getMessageContentById).mockResolvedValueOnce(
      err(notFound),
    );

    const result = await getMessage({
      fiscalCode,
      messageId,
      publicMessage: false,
    });

    expect(result._unsafeUnwrapErr()).toBe(notFound);
  });

  it("returns a generic error when public enrichment status is missing", async () => {
    vi.mocked(
      statusRepository.getLatestMessageStatusById,
    ).mockResolvedValueOnce(
      err(new NotFoundError("status", "status not found")),
    );

    const result = await getMessage({
      fiscalCode,
      messageId,
      publicMessage: true,
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toContain("status not found");
  });
});

describe("makeGetMessageUseCase - enrichment", () => {
  it("fills a missing payment payee and uses it in the payment category", async () => {
    vi.mocked(contentRepository.getMessageContentById).mockResolvedValueOnce(
      ok({
        markdown: "a".repeat(80),
        payment_data: {
          amount: 1000,
          invalid_after_due_date: false,
          notice_number: "012345678901234567",
        },
        require_secure_channels: false,
        subject: "a valid subject",
      }),
    );

    const result = await getMessage({
      fiscalCode,
      messageId,
      publicMessage: true,
    });

    expect(result._unsafeUnwrap().message).toMatchObject({
      category: {
        rptId: "01234567890012345678901234567",
        tag: "PAYMENT",
      },
      content: {
        payment_data: {
          payee: { fiscal_code: "01234567890" },
        },
      },
    });
    expect(
      servicesRepository.getServicesCmsDetailsByServiceIds,
    ).toHaveBeenCalledTimes(1);
  });

  it("fills third-party configuration without list-only RC properties", async () => {
    const configurationId = "01HAQ4HYBR5JZCS6K0DT7M1EV8";
    serviceToRcMap.set(serviceId, configurationId);
    vi.mocked(contentRepository.getMessageContentById).mockResolvedValueOnce(
      ok({
        markdown: "a".repeat(80),
        require_secure_channels: false,
        subject: "a valid subject",
        third_party_data: {
          has_attachments: true,
          has_remote_content: true,
          id: "third-party-id",
        },
      }),
    );
    vi.mocked(
      metadataRepository.getMessageMetadataByFiscalCodeAndId,
    ).mockResolvedValueOnce(
      ok({
        createdAt: "2023-01-01T00:00:00.000Z",
        featureLevelType: "STANDARD",
        fiscalCode,
        id: messageId,
        indexedId: messageId,
        isPending: false,
        senderServiceId: "pn-service-id",
        senderUserId: "sender",
        timeToLiveSeconds: 3600,
      }),
    );
    serviceToRcMap.set("pn-service-id", configurationId);
    vi.mocked(
      servicesRepository.getServicesCmsDetailsByServiceIds,
    ).mockResolvedValueOnce(
      ok(
        new Map([
          [
            "pn-service-id",
            ok({
              authorized_cidrs: [],
              authorized_recipients: [],
              description: "description",
              id: "pn-service-id",
              last_update: "2024-01-01T00:00:00.000Z",
              max_allowed_payment_amount: 1000,
              metadata: { scope: "NATIONAL" },
              name: "PN Service",
              organization: {
                fiscal_code: "01234567890",
                name: "PN Organization",
              },
              require_secure_channel: false,
              status: { value: "published" },
            }),
          ],
        ]),
      ),
    );
    const result = await getMessage({
      fiscalCode,
      messageId,
      publicMessage: true,
    });

    expect(result._unsafeUnwrap().message).toMatchObject({
      category: {
        configuration_id: configurationId,
        has_attachments: true,
        tag: "PN",
      },
      content: {
        third_party_data: { configuration_id: configurationId },
      },
    });
    expect(result._unsafeUnwrap().message).not.toHaveProperty(
      "has_attachments",
    );
    expect(result._unsafeUnwrap().message).not.toHaveProperty(
      "has_precondition",
    );
  });

  it("fails when a third-party configuration cannot be resolved", async () => {
    vi.mocked(contentRepository.getMessageContentById).mockResolvedValueOnce(
      ok({
        markdown: "a".repeat(80),
        require_secure_channels: false,
        subject: "a valid subject",
        third_party_data: {
          has_attachments: false,
          has_remote_content: false,
          id: "third-party-id",
        },
      }),
    );

    const result = await getMessage({
      fiscalCode,
      messageId,
      publicMessage: false,
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(statusRepository.getLatestMessageStatusById).not.toHaveBeenCalled();
  });
});
