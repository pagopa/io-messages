import {
  FiscalCodeSchema,
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MalformedEntityError } from "../../ports/error.js";
import { MessageContentRepository } from "../../ports/message-content.js";
import { MessageMetadataRepository } from "../../ports/message-metadata.js";
import { MessageStatusRepository } from "../../ports/message-status.js";
import { PaymentStatusRepository } from "../../ports/payment-status.js";
import { ProfileRepository } from "../../ports/profile.js";
import { ServicePreferencesRepository } from "../../ports/service-preferences.js";
import { makeGetMessageForServiceUseCase } from "../get-service-message.use-case.js";

const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
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
  getMessageMetadata: vi.fn().mockResolvedValue(
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

const profileRepository: ProfileRepository = {
  getProfile: vi.fn().mockResolvedValue(
    ok({
      lastAppVersion: "2.1.0.7",
      servicePreferencesSettings: { mode: "AUTO", version: 1 },
    }),
  ),
};
const servicePreferencesRepository: ServicePreferencesRepository = {
  getServicePreferences: vi
    .fn()
    .mockResolvedValue(ok({ accessReadMessageStatus: "ALLOW" })),
};

const paymentStatusRepository = {
  getPaymentStatus: vi.fn().mockResolvedValue(ok("NOT_PAID")),
} as unknown as PaymentStatusRepository;

const getServiceMessage = makeGetMessageForServiceUseCase(
  metadataRepository,
  statusRepository,
  contentRepository,
  profileRepository,
  servicePreferencesRepository,
  paymentStatusRepository,
  "2.0.0",
);

beforeEach(() => vi.clearAllMocks());

describe("makeGetMessageForServiceUseCase", () => {
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
    expect(profileRepository.getProfile).not.toHaveBeenCalled();
    expect(
      servicePreferencesRepository.getServicePreferences,
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
});

describe("makeGetMessageForServiceUseCase - read normalization", () => {
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

  it("preserves a rejected status when the content is absent", async () => {
    vi.mocked(contentRepository.getMessageContentById).mockResolvedValueOnce(
      err(new NotFoundError("content", "not found")),
    );
    vi.mocked(
      statusRepository.getLatestMessageStatusById,
    ).mockResolvedValueOnce(
      ok({
        id: `${messageId}-0000000000000000`,
        isArchived: false,
        isRead: false,
        messageId,
        status: "REJECTED",
        updatedAt: "2023-01-01T00:00:00.000Z",
        version: 0,
      }),
    );

    const result = await getServiceMessage(baseInput);

    expect(result._unsafeUnwrap().status).toBe("REJECTED");
    expect(result._unsafeUnwrap().message).not.toHaveProperty("content");
  });

  it("preserves content and reports an unread advanced message when the status is absent", async () => {
    vi.mocked(metadataRepository.getMessageMetadata).mockResolvedValueOnce(
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
      ok({ ...content, payment_data: paymentData }),
    );
    vi.mocked(
      statusRepository.getLatestMessageStatusById,
    ).mockResolvedValueOnce(err(new NotFoundError("status", "not found")));

    const result = await getServiceMessage({
      ...baseInput,
      groups: new Set(["ApiMessageReadAdvanced"]),
    });

    expect(result._unsafeUnwrap()).toMatchObject({
      message: { content: { ...content, payment_data: paymentData } },
      read_status: "UNREAD",
      status: "ACCEPTED",
    });
    expect(paymentStatusRepository.getPaymentStatus).not.toHaveBeenCalled();
  });

  it.each([
    ["content", new GenericError("content read failed")],
    ["content", new MalformedEntityError("invalid content")],
    ["content", new TooManyRequestsError()],
    ["status", new GenericError("status read failed")],
    ["status", new MalformedEntityError("invalid status")],
    ["status", new TooManyRequestsError()],
  ] as const)(
    "propagates %s read error %s even when the other resource is absent",
    async (resource, dependencyError) => {
      vi.mocked(contentRepository.getMessageContentById).mockResolvedValueOnce(
        err(
          resource === "content"
            ? dependencyError
            : new NotFoundError("content", "not found"),
        ),
      );
      vi.mocked(
        statusRepository.getLatestMessageStatusById,
      ).mockResolvedValueOnce(
        err(
          resource === "status"
            ? dependencyError
            : new NotFoundError("status", "not found"),
        ),
      );

      const result = await getServiceMessage(baseInput);

      expect(result._unsafeUnwrapErr()).toBe(dependencyError);
    },
  );
});

describe("makeGetMessageForServiceUseCase - advanced fields", () => {
  it("decorates an eligible advanced payment message", async () => {
    vi.mocked(metadataRepository.getMessageMetadata).mockResolvedValueOnce(
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
    expect(profileRepository.getProfile).toHaveBeenCalledWith(fiscalCode);
    expect(
      servicePreferencesRepository.getServicePreferences,
    ).toHaveBeenCalledWith(fiscalCode, "subscription-id", 1);
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
      vi.mocked(metadataRepository.getMessageMetadata).mockResolvedValueOnce(
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

  it.each([
    ["generic", new GenericError("authorization failed")],
    ["malformed", new MalformedEntityError("invalid user profile")],
  ])("propagates %s authorization failures", async (_, dependencyError) => {
    vi.mocked(metadataRepository.getMessageMetadata).mockResolvedValueOnce(
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
    vi.mocked(profileRepository.getProfile).mockResolvedValueOnce(
      err(dependencyError),
    );

    const result = await getServiceMessage({
      ...baseInput,
      groups: new Set(["ApiMessageReadAdvanced"]),
    });

    expect(result._unsafeUnwrapErr()).toBe(dependencyError);
    expect(
      servicePreferencesRepository.getServicePreferences,
    ).not.toHaveBeenCalled();
  });
});

describe("makeGetMessageForServiceUseCase - read authorization policy", () => {
  const advancedInput = {
    ...baseInput,
    groups: new Set(["ApiMessageReadAdvanced"]),
  };

  beforeEach(() => {
    vi.mocked(metadataRepository.getMessageMetadata).mockResolvedValueOnce(
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
  });

  it.each(["UNKNOWN", "1.9.9", "1.9.9.99"])(
    "denies an unsupported app version %s without reading preferences",
    async (lastAppVersion) => {
      vi.mocked(profileRepository.getProfile).mockResolvedValueOnce(
        ok({
          lastAppVersion,
          servicePreferencesSettings: { mode: "AUTO", version: 1 },
        }),
      );

      const result = await getServiceMessage(advancedInput);

      expect(result._unsafeUnwrap().read_status).toBe("UNAVAILABLE");
      expect(
        servicePreferencesRepository.getServicePreferences,
      ).not.toHaveBeenCalled();
    },
  );

  it("denies legacy settings without reading preferences", async () => {
    vi.mocked(profileRepository.getProfile).mockResolvedValueOnce(
      ok({
        lastAppVersion: "2.1.0",
        servicePreferencesSettings: { mode: "LEGACY", version: -1 },
      }),
    );

    const result = await getServiceMessage(advancedInput);

    expect(result._unsafeUnwrap().read_status).toBe("UNAVAILABLE");
    expect(
      servicePreferencesRepository.getServicePreferences,
    ).not.toHaveBeenCalled();
  });

  it.each(["2.0.0", "2.0.0.7"])(
    "allows the minimum version %s and uses the active settings version",
    async (lastAppVersion) => {
      vi.mocked(profileRepository.getProfile).mockResolvedValueOnce(
        ok({
          lastAppVersion,
          servicePreferencesSettings: { mode: "MANUAL", version: 42 },
        }),
      );

      const result = await getServiceMessage(advancedInput);

      expect(result._unsafeUnwrap().read_status).toBe("READ");
      expect(
        servicePreferencesRepository.getServicePreferences,
      ).toHaveBeenCalledWith(fiscalCode, baseInput.subscriptionId, 42);
    },
  );

  it.each([
    ["ALLOW", "READ"],
    ["UNKNOWN", "READ"],
    ["DENY", "UNAVAILABLE"],
  ] as const)(
    "maps preference %s to %s",
    async (accessReadMessageStatus, expected) => {
      vi.mocked(
        servicePreferencesRepository.getServicePreferences,
      ).mockResolvedValueOnce(ok({ accessReadMessageStatus }));

      const result = await getServiceMessage(advancedInput);

      expect(result._unsafeUnwrap().read_status).toBe(expected);
    },
  );

  it("allows access when service preferences are missing", async () => {
    vi.mocked(
      servicePreferencesRepository.getServicePreferences,
    ).mockResolvedValueOnce(
      err(new NotFoundError("Service preferences", "not found")),
    );

    const result = await getServiceMessage(advancedInput);

    expect(result._unsafeUnwrap().read_status).toBe("READ");
  });

  it.each([
    new GenericError("preference read failed"),
    new MalformedEntityError("invalid user service preference"),
  ])(
    "propagates preference failures instead of granting access: %s",
    async (dependencyError) => {
      vi.mocked(
        servicePreferencesRepository.getServicePreferences,
      ).mockResolvedValueOnce(err(dependencyError));

      const result = await getServiceMessage(advancedInput);

      expect(result._unsafeUnwrapErr()).toBe(dependencyError);
    },
  );

  it("still retrieves payment status when access to read status is denied", async () => {
    vi.mocked(
      servicePreferencesRepository.getServicePreferences,
    ).mockResolvedValueOnce(ok({ accessReadMessageStatus: "DENY" }));
    vi.mocked(contentRepository.getMessageContentById).mockResolvedValueOnce(
      ok({ ...content, payment_data: paymentData }),
    );

    const result = await getServiceMessage(advancedInput);

    expect(result._unsafeUnwrap()).toMatchObject({
      payment_status: "NOT_PAID",
      read_status: "UNAVAILABLE",
    });
    expect(paymentStatusRepository.getPaymentStatus).toHaveBeenCalledOnce();
  });
});
