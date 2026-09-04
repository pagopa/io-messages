import {
  ForbiddenError,
  GenericError,
  NotFoundError,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MessageContentRepository } from "../../ports/message-content.js";
import { MessageMetadataRepository } from "../../ports/message-metadata.js";
import { MessageReadAuthorizationRepository } from "../../ports/message-read-authorization.js";
import { MessageStatusRepository } from "../../ports/message-status.js";
import { PaymentStatusRepository } from "../../ports/payment-status.js";
import { makeGetServiceMessageUseCase } from "../get-service-message.use-case.js";

const fiscalCode = "RSSMRA80A01H501U";
const messageId = "01JAQ4HYBR5JZCS6K0DT7M1EV8";
const serviceId = "01JHYBR5JZCS6K0DT7M1EV8N2F";
const baseInput = {
  fiscalCode,
  groups: new Set<string>(),
  messageId,
  serviceId,
  subscriptionId: "subscription-id",
};

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

const content = {
  markdown: "a".repeat(80),
  subject: "a valid subject",
};
const paymentData = {
  amount: 100,
  invalid_after_due_date: false,
  notice_number: "012345678901234567",
  payee: { fiscal_code: "01234567890" },
};
const contentRepository = {
  getMessageContentById: vi.fn().mockResolvedValue(ok(content)),
} as unknown as MessageContentRepository;

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

const readAuthorizationRepository = {
  canAccessReadStatus: vi.fn().mockResolvedValue(ok(true)),
} as unknown as MessageReadAuthorizationRepository;

const paymentStatusRepository = {
  getPaymentStatus: vi.fn().mockResolvedValue(ok("NOT_PAID")),
} as unknown as PaymentStatusRepository;

const getServiceMessage = makeGetServiceMessageUseCase(
  metadataRepository,
  statusRepository,
  contentRepository,
  readAuthorizationRepository,
  paymentStatusRepository,
);

beforeEach(() => vi.clearAllMocks());

describe("makeGetServiceMessageUseCase", () => {
  it("returns the service contract without advanced fields", async () => {
    const result = await getServiceMessage(baseInput);

    expect(result._unsafeUnwrap()).toEqual({
      message: {
        content,
        created_at: "2023-01-01T00:00:00.000Z",
        feature_level_type: "STANDARD",
        fiscal_code: fiscalCode,
        id: messageId,
        sender_service_id: serviceId,
        time_to_live: 3600,
      },
      status: "PROCESSED",
    });
    expect(
      readAuthorizationRepository.canAccessReadStatus,
    ).not.toHaveBeenCalled();
    expect(paymentStatusRepository.getPaymentStatus).not.toHaveBeenCalled();
  });

  it("returns forbidden before reading content for another service", async () => {
    const result = await getServiceMessage({
      ...baseInput,
      serviceId: "another-service",
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expect(contentRepository.getMessageContentById).not.toHaveBeenCalled();
    expect(statusRepository.getLatestMessageStatusById).not.toHaveBeenCalled();
  });

  it("returns a message without content and defaults a missing status", async () => {
    vi.mocked(contentRepository.getMessageContentById).mockResolvedValueOnce(
      err(new NotFoundError("content", "not found")),
    );
    vi.mocked(
      statusRepository.getLatestMessageStatusById,
    ).mockResolvedValueOnce(err(new NotFoundError("status", "not found")));

    const result = await getServiceMessage(baseInput);

    expect(result._unsafeUnwrap()).toEqual({
      message: {
        created_at: "2023-01-01T00:00:00.000Z",
        feature_level_type: "STANDARD",
        fiscal_code: fiscalCode,
        id: messageId,
        sender_service_id: serviceId,
        time_to_live: 3600,
      },
      status: "ACCEPTED",
    });
  });

  it("decorates an eligible advanced payment message", async () => {
    vi.mocked(
      metadataRepository.getMessageMetadataByFiscalCodeAndId,
    ).mockResolvedValueOnce(
      ok({
        createdAt: "2023-01-01T00:00:00.000Z",
        featureLevelType: "ADVANCED",
        fiscalCode,
        id: messageId,
        indexedId: messageId,
        isPending: false,
        senderServiceId: serviceId,
        senderUserId: "sender",
        timeToLiveSeconds: 3600,
      }),
    );
    vi.mocked(contentRepository.getMessageContentById).mockResolvedValueOnce(
      ok({
        ...content,
        payment_data: paymentData,
      }),
    );
    vi.mocked(paymentStatusRepository.getPaymentStatus).mockResolvedValueOnce(
      ok("PAID"),
    );

    const result = await getServiceMessage({
      ...baseInput,
      groups: new Set(["ApiMessageReadAdvanced"]),
    });

    expect(result._unsafeUnwrap()).toMatchObject({
      payment_status: "PAID",
      read_status: "READ",
      status: "PROCESSED",
    });
    expect(
      readAuthorizationRepository.canAccessReadStatus,
    ).toHaveBeenCalledWith("subscription-id", fiscalCode);
    expect(paymentStatusRepository.getPaymentStatus).toHaveBeenCalledWith(
      "01234567890012345678901234567",
    );
  });

  it.each([
    ["a pending message", true, "PROCESSED", paymentData],
    ["a non-processed message", false, "ACCEPTED", paymentData],
    ["missing payment data", false, "PROCESSED", undefined],
    [
      "a missing payee",
      false,
      "PROCESSED",
      { ...paymentData, payee: undefined },
    ],
    [
      "a missing payee fiscal code",
      false,
      "PROCESSED",
      { ...paymentData, payee: {} },
    ],
  ] as const)(
    "does not retrieve payment status for %s",
    async (_, isPending, status, ineligiblePaymentData) => {
      vi.mocked(
        metadataRepository.getMessageMetadataByFiscalCodeAndId,
      ).mockResolvedValueOnce(
        ok({
          createdAt: "2023-01-01T00:00:00.000Z",
          featureLevelType: "ADVANCED",
          fiscalCode,
          id: messageId,
          indexedId: messageId,
          isPending,
          senderServiceId: serviceId,
          senderUserId: "sender",
          timeToLiveSeconds: 3600,
        }),
      );
      vi.mocked(
        statusRepository.getLatestMessageStatusById,
      ).mockResolvedValueOnce(
        ok({
          id: `${messageId}-0000000000000000`,
          isArchived: false,
          isRead: true,
          messageId,
          status,
          updatedAt: "2023-01-01T00:00:00.000Z",
          version: 0,
        }),
      );
      vi.mocked(contentRepository.getMessageContentById).mockResolvedValueOnce(
        ok({
          ...content,
          ...(ineligiblePaymentData
            ? { payment_data: ineligiblePaymentData }
            : {}),
        }),
      );

      const result = await getServiceMessage({
        ...baseInput,
        groups: new Set(["ApiMessageReadAdvanced"]),
      });

      expect(result._unsafeUnwrap()).not.toHaveProperty("payment_status");
      expect(paymentStatusRepository.getPaymentStatus).not.toHaveBeenCalled();
    },
  );

  it("propagates advanced dependency failures", async () => {
    vi.mocked(
      metadataRepository.getMessageMetadataByFiscalCodeAndId,
    ).mockResolvedValueOnce(
      ok({
        createdAt: "2023-01-01T00:00:00.000Z",
        featureLevelType: "ADVANCED",
        fiscalCode,
        id: messageId,
        indexedId: messageId,
        isPending: false,
        senderServiceId: serviceId,
        senderUserId: "sender",
        timeToLiveSeconds: 3600,
      }),
    );
    const dependencyError = new GenericError("authorization failed");
    vi.mocked(
      readAuthorizationRepository.canAccessReadStatus,
    ).mockResolvedValueOnce(err(dependencyError));

    const result = await getServiceMessage({
      ...baseInput,
      groups: new Set(["ApiMessageReadAdvanced"]),
    });

    expect(result._unsafeUnwrapErr()).toBe(dependencyError);
  });
});
