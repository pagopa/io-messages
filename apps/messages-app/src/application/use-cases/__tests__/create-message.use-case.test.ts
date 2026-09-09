import type { Logger } from "@pagopa/hexagonal-core/domain/ports";
import type { FiscalCode } from "io-messages-common/domain/fiscal-code";
import type { RCConfiguration } from "io-messages-common/domain/remote-content";

import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import { messageIDSchema } from "io-messages-common/domain/message";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ClientIp } from "../../../domain/client-ip.js";
import type {
  CreateMessagePermission,
  NewMessage,
} from "../../ports/create-message.js";
import type { MessageCreatedEventPublisher } from "../../ports/message-created-event.js";
import type {
  MessageMetadata,
  MessageMetadataRepository,
} from "../../ports/message-metadata.js";
import type { ProcessingMessagePayloadStore } from "../../ports/processing-message.js";
import type { RCConfigurationRepository } from "../../ports/rc-configuration.js";
import type {
  ServicesCmsDetail,
  ServicesCmsRepository,
} from "../../ports/services-cms.js";
import type {
  CreateMessageInput,
  CreateMessageUseCase,
} from "../create-message.use-case.js";

import { clientIpSchema } from "../../../domain/client-ip.js";
import { newMessageSchema } from "../../ports/create-message.js";
import { MalformedEntityError } from "../../ports/error.js";
import { makeCreateMessageUseCase } from "../create-message.use-case.js";

const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const serviceId = "01ARZ3NDEKTSV4RRFFQ69G5FAW";
const configurationId = "01ARZ3NDEKTSV4RRFFQ69G5FAX";
const fiscalCode = fiscalCodeSchema.parse("RSSMRA80A01H501U");
const anotherFiscalCode = fiscalCodeSchema.parse("AAABBB00A00A000A");
const clientIp = clientIpSchema.parse("192.0.2.10");
const now = new Date("2026-08-28T12:00:00.000Z");
const userId =
  "/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ApiManagement/service/apim/users/a-user-id";

type MessageOverrides = {
  content?: Partial<NewMessage["content"]>;
} & Omit<Partial<NewMessage>, "content">;

const aThirdPartyData = (
  overrides: Partial<
    NonNullable<NewMessage["content"]["third_party_data"]>
  > = {},
): NonNullable<NewMessage["content"]["third_party_data"]> => ({
  configuration_id: configurationId,
  has_attachments: false,
  has_remote_content: false,
  id: "third-party-message-id",
  ...overrides,
});

const aMessage = ({
  content,
  ...overrides
}: MessageOverrides = {}): NewMessage =>
  newMessageSchema.parse({
    content: {
      markdown: "a".repeat(80),
      subject: "A valid message subject",
      ...content,
    },
    ...overrides,
  });

const aService = (
  overrides: Partial<ServicesCmsDetail> = {},
): ServicesCmsDetail => ({
  authorized_cidrs: ["192.0.2.0/24"],
  authorized_recipients: [fiscalCode],
  description: "A service description",
  id: serviceId,
  last_update: "2026-08-28T10:00:00.000Z",
  max_allowed_payment_amount: 10_000,
  metadata: {
    scope: "NATIONAL",
  },
  name: "A service name",
  organization: {
    fiscal_code: "01234567890",
    name: "An organization",
  },
  require_secure_channel: true,
  status: {
    value: "published",
  },
  ...overrides,
});

const anRCConfiguration = (
  overrides: Partial<RCConfiguration> = {},
): RCConfiguration => ({
  configurationId,
  description: "A remote-content configuration",
  disableLollipopFor: [],
  hasPrecondition: "ALWAYS",
  id: configurationId,
  isLollipopEnabled: false,
  name: "A configuration",
  userId: "a-user-id",
  ...overrides,
});

const permissions = (
  ...values: CreateMessagePermission[]
): ReadonlySet<CreateMessagePermission> => new Set(values);

interface Dependencies {
  clock: ReturnType<typeof vi.fn<() => Date>>;
  generateMessageId: ReturnType<typeof vi.fn<() => string>>;
  logger: Logger;
  messageCreatedEventPublisher: MessageCreatedEventPublisher;
  messageMetadataRepository: MessageMetadataRepository;
  processingMessagePayloadStore: ProcessingMessagePayloadStore;
  remoteContentConfigurationRepository: RCConfigurationRepository;
  service: ServicesCmsDetail;
  servicesCmsRepository: ServicesCmsRepository;
  trackEvent: ReturnType<typeof vi.fn>;
}

const makeDependencies = (
  service: ServicesCmsDetail = aService(),
): Dependencies => {
  const messageMetadataRepository: MessageMetadataRepository = {
    createMessageMetadata: vi
      .fn<MessageMetadataRepository["createMessageMetadata"]>()
      .mockImplementation(async (metadata) => ok(metadata)),
    getMessageMetadataByFiscalCodeAndId: vi.fn(),
    getMessagesMetadataByUser: vi.fn(),
  };
  const servicesCmsRepository: ServicesCmsRepository = {
    getServiceCmsDetails: vi
      .fn<ServicesCmsRepository["getServiceCmsDetails"]>()
      .mockResolvedValue(ok(service)),
    getServicesCmsDetailsByServiceIds: vi
      .fn<ServicesCmsRepository["getServicesCmsDetailsByServiceIds"]>()
      .mockResolvedValue(ok(new Map([[serviceId, ok(service)]]))),
  };
  const remoteContentConfigurationRepository: RCConfigurationRepository = {
    getRemoteContentConfiguration: vi
      .fn<RCConfigurationRepository["getRemoteContentConfiguration"]>()
      .mockResolvedValue(ok(anRCConfiguration())),
  };
  const processingMessagePayloadStore: ProcessingMessagePayloadStore = {
    savePayload: vi
      .fn<ProcessingMessagePayloadStore["savePayload"]>()
      .mockResolvedValue(ok(undefined)),
  };
  const messageCreatedEventPublisher: MessageCreatedEventPublisher = {
    publish: vi
      .fn<MessageCreatedEventPublisher["publish"]>()
      .mockResolvedValue(ok(undefined)),
  };
  const trackEvent = vi.fn();

  return {
    clock: vi.fn(() => now),
    generateMessageId: vi.fn(() => messageId),
    logger: { trackEvent } as unknown as Logger,
    messageCreatedEventPublisher,
    messageMetadataRepository,
    processingMessagePayloadStore,
    remoteContentConfigurationRepository,
    service,
    servicesCmsRepository,
    trackEvent,
  };
};

const makeUseCase = (dependencies: Dependencies): CreateMessageUseCase =>
  makeCreateMessageUseCase(
    dependencies.messageMetadataRepository,
    dependencies.servicesCmsRepository,
    dependencies.remoteContentConfigurationRepository,
    dependencies.processingMessagePayloadStore,
    dependencies.messageCreatedEventPublisher,
    dependencies.logger,
    dependencies.generateMessageId,
    dependencies.clock,
  );

const anInput = (
  overrides: Partial<CreateMessageInput> = {},
): CreateMessageInput => ({
  clientIp,
  fiscalCode,
  message: aMessage(),
  permissions: permissions("ApiMessageWrite"),
  subscriptionId: serviceId,
  userEmail: "service@example.com",
  userId,
  ...overrides,
});

const expectNoPersistence = (dependencies: Dependencies): void => {
  expect(
    dependencies.messageMetadataRepository.createMessageMetadata,
  ).not.toHaveBeenCalled();
  expect(
    dependencies.processingMessagePayloadStore.savePayload,
  ).not.toHaveBeenCalled();
  expect(
    dependencies.messageCreatedEventPublisher.publish,
  ).not.toHaveBeenCalled();
};

// eslint-disable-next-line max-lines-per-function
describe("makeCreateMessageUseCase", () => {
  let dependencies: Dependencies;
  let useCase: CreateMessageUseCase;

  beforeEach(() => {
    dependencies = makeDependencies();
    useCase = makeUseCase(dependencies);
  });

  it("creates metadata, stores the processing payload and publishes the event", async () => {
    const input = anInput();

    const result = await useCase(input);

    expect(result._unsafeUnwrap()).toEqual({ id: messageId });

    const expectedMetadata: MessageMetadata = {
      createdAt: now.toISOString(),
      featureLevelType: "STANDARD",
      fiscalCode,
      id: messageId,
      indexedId: messageId,
      isPending: true,
      senderServiceId: serviceId,
      senderUserId: userId,
      timeToLiveSeconds: 3600,
    };
    expect(
      dependencies.messageMetadataRepository.createMessageMetadata,
    ).toHaveBeenCalledWith(expectedMetadata);
    expect(
      dependencies.processingMessagePayloadStore.savePayload,
    ).toHaveBeenCalledWith({
      content: input.message.content,
      message: expectedMetadata,
      senderMetadata: {
        organizationFiscalCode: "01234567890",
        organizationName: "An organization",
        requireSecureChannels: true,
        serviceCategory: "STANDARD",
        serviceName: "A service name",
        serviceUserEmail: "service@example.com",
      },
    });
    expect(
      dependencies.messageCreatedEventPublisher.publish,
    ).toHaveBeenCalledWith({
      defaultAddresses: {},
      messageId,
    });

    const createOrder = vi.mocked(
      dependencies.messageMetadataRepository.createMessageMetadata,
    ).mock.invocationCallOrder[0];
    const saveOrder = vi.mocked(
      dependencies.processingMessagePayloadStore.savePayload,
    ).mock.invocationCallOrder[0];
    const publishOrder = vi.mocked(
      dependencies.messageCreatedEventPublisher.publish,
    ).mock.invocationCallOrder[0];
    expect(createOrder).toBeLessThan(saveOrder);
    expect(saveOrder).toBeLessThan(publishOrder);
  });

  it("uses body fiscal code and message sender-metadata overrides", async () => {
    dependencies = makeDependencies(
      aService({
        metadata: {
          category: "SPECIAL",
          scope: "NATIONAL",
        },
        require_secure_channel: true,
      }),
    );
    useCase = makeUseCase(dependencies);
    const message = aMessage({
      content: {
        require_secure_channels: false,
      },
      default_addresses: {
        email: "recipient@example.com",
      },
      fiscal_code: fiscalCode,
      time_to_live: 7200,
    });

    const result = await useCase(
      anInput({
        fiscalCode: undefined,
        message,
      }),
    );

    expect(result.isOk()).toBe(true);
    expect(
      dependencies.messageMetadataRepository.createMessageMetadata,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        fiscalCode,
        timeToLiveSeconds: 7200,
      }),
    );
    expect(
      dependencies.processingMessagePayloadStore.savePayload,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        senderMetadata: expect.objectContaining({
          requireSecureChannels: false,
          serviceCategory: "SPECIAL",
        }),
      }),
    );
    expect(
      dependencies.messageCreatedEventPublisher.publish,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultAddresses: {},
      }),
    );
  });

  it("uses the default message-id generator and clock", async () => {
    const defaultedUseCase = makeCreateMessageUseCase(
      dependencies.messageMetadataRepository,
      dependencies.servicesCmsRepository,
      dependencies.remoteContentConfigurationRepository,
      dependencies.processingMessagePayloadStore,
      dependencies.messageCreatedEventPublisher,
      dependencies.logger,
    );

    const result = await defaultedUseCase(anInput());

    expect(result.isOk()).toBe(true);
    const created = result._unsafeUnwrap();
    expect(messageIDSchema.safeParse(created.id).success).toBe(true);
    expect(
      dependencies.messageMetadataRepository.createMessageMetadata,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: expect.any(String),
        id: created.id,
        indexedId: created.id,
      }),
    );
  });

  it.each([
    new GenericError("service lookup failed"),
    new TooManyRequestsError(),
  ])("propagates service repository errors", async (error) => {
    vi.mocked(
      dependencies.servicesCmsRepository.getServiceCmsDetails,
    ).mockResolvedValue(err(error));

    const result = await useCase(anInput());

    expect(result._unsafeUnwrapErr()).toBe(error);
    expectNoPersistence(dependencies);
  });

  it("returns forbidden when the service does not exist", async () => {
    vi.mocked(
      dependencies.servicesCmsRepository.getServiceCmsDetails,
    ).mockResolvedValue(err(new NotFoundError("service detail", serviceId)));

    const result = await useCase(anInput());

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expectNoPersistence(dependencies);
  });

  it("maps malformed service details to a generic error", async () => {
    vi.mocked(
      dependencies.servicesCmsRepository.getServiceCmsDetails,
    ).mockResolvedValue(err(new MalformedEntityError("invalid service")));

    const result = await useCase(anInput());

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Generic error: Error while retrieving the service tied to the provided subscription id",
    );
    expectNoPersistence(dependencies);
  });

  it.each([
    [
      "EU Covid certificate",
      aMessage({
        content: {
          eu_covid_cert: {
            auth_code: "auth-code",
          },
        },
      }),
    ],
    [
      "payment payee",
      aMessage({
        content: {
          payment_data: {
            amount: 100,
            invalid_after_due_date: false,
            notice_number: "012345678901234567",
            payee: {
              fiscal_code: "01234567890",
            },
          },
        },
      }),
    ],
    [
      "ADVANCED feature level",
      aMessage({
        feature_level_type: "ADVANCED",
      }),
    ],
    [
      "STANDARD third-party data",
      aMessage({
        content: {
          third_party_data: aThirdPartyData(),
        },
      }),
    ],
  ])("returns forbidden without permission for %s", async (_, message) => {
    const result = await useCase(anInput({ message }));

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expectNoPersistence(dependencies);
  });

  it("accepts protected STANDARD payloads with all required permissions", async () => {
    const message = aMessage({
      content: {
        eu_covid_cert: {
          auth_code: "auth-code",
        },
        payment_data: {
          amount: 100,
          invalid_after_due_date: false,
          notice_number: "012345678901234567",
          payee: {
            fiscal_code: "01234567890",
          },
        },
        third_party_data: aThirdPartyData(),
      },
    });

    const result = await useCase(
      anInput({
        message,
        permissions: permissions(
          "ApiMessageWrite",
          "ApiMessageWriteEUCovidCert",
          "ApiMessageWriteWithPayee",
          "ApiThirdPartyMessageWrite",
        ),
      }),
    );

    expect(result.isOk()).toBe(true);
  });

  it("does not require third-party permission for an ADVANCED message", async () => {
    const result = await useCase(
      anInput({
        message: aMessage({
          content: {
            third_party_data: aThirdPartyData(),
          },
          feature_level_type: "ADVANCED",
        }),
        permissions: permissions("ApiMessageWrite", "ApiMessageWriteAdvanced"),
      }),
    );

    expect(result.isOk()).toBe(true);
  });

  it("allows any client IP when the CIDR allowlist is empty", async () => {
    dependencies = makeDependencies(aService({ authorized_cidrs: [] }));
    useCase = makeUseCase(dependencies);

    const result = await useCase(
      anInput({
        clientIp: clientIpSchema.parse("203.0.113.10"),
      }),
    );

    expect(result.isOk()).toBe(true);
  });

  it("treats an address without a prefix as a single-host /32", async () => {
    dependencies = makeDependencies(
      aService({ authorized_cidrs: ["192.0.2.10"] }),
    );
    useCase = makeUseCase(dependencies);

    const result = await useCase(anInput());

    expect(result.isOk()).toBe(true);
  });

  it("returns forbidden when the client IP is outside the authorized CIDRs", async () => {
    const result = await useCase(
      anInput({
        clientIp: clientIpSchema.parse("203.0.113.10"),
      }),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expectNoPersistence(dependencies);
  });

  it("returns forbidden for an IPv6 client when only IPv4 CIDRs are authorized", async () => {
    const result = await useCase(
      anInput({
        clientIp: clientIpSchema.parse("2001:db8::1"),
      }),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expectNoPersistence(dependencies);
  });

  it("returns validation error when fiscal code is in both path and payload", async () => {
    const result = await useCase(
      anInput({
        message: aMessage({
          fiscal_code: fiscalCode,
        }),
      }),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ValidationError);
    expect(result._unsafeUnwrapErr().message).toContain("but not in both");
    expectNoPersistence(dependencies);
  });

  it("returns validation error when fiscal code is missing", async () => {
    const result = await useCase(
      anInput({
        fiscalCode: undefined,
      }),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ValidationError);
    expect(result._unsafeUnwrapErr().message).toContain(
      "specified in the path or in the payload",
    );
    expectNoPersistence(dependencies);
  });

  it("returns forbidden when third-party data has no configuration id", async () => {
    const result = await useCase(
      anInput({
        message: aMessage({
          content: {
            third_party_data: aThirdPartyData({
              configuration_id: undefined,
            }),
          },
        }),
        permissions: permissions(
          "ApiMessageWrite",
          "ApiThirdPartyMessageWrite",
        ),
      }),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expect(
      dependencies.remoteContentConfigurationRepository
        .getRemoteContentConfiguration,
    ).not.toHaveBeenCalled();
    expectNoPersistence(dependencies);
  });

  it("propagates a missing remote-content configuration", async () => {
    const error = new NotFoundError(
      "remote content configuration",
      configurationId,
    );
    vi.mocked(
      dependencies.remoteContentConfigurationRepository
        .getRemoteContentConfiguration,
    ).mockResolvedValue(err(error));

    const result = await useCase(
      anInput({
        message: aMessage({
          content: {
            third_party_data: aThirdPartyData(),
          },
        }),
        permissions: permissions(
          "ApiMessageWrite",
          "ApiThirdPartyMessageWrite",
        ),
      }),
    );

    expect(result._unsafeUnwrapErr()).toBe(error);
    expectNoPersistence(dependencies);
  });

  it.each([
    new GenericError("remote-content unavailable"),
    new TooManyRequestsError(),
  ])(
    "maps remote-content repository failures to generic error",
    async (error) => {
      vi.mocked(
        dependencies.remoteContentConfigurationRepository
          .getRemoteContentConfiguration,
      ).mockResolvedValue(err(error));

      const result = await useCase(
        anInput({
          message: aMessage({
            content: {
              third_party_data: aThirdPartyData(),
            },
          }),
          permissions: permissions(
            "ApiMessageWrite",
            "ApiThirdPartyMessageWrite",
          ),
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
      expect(result._unsafeUnwrapErr().message).toContain(
        "Service unreachable",
      );
      expectNoPersistence(dependencies);
    },
  );

  it("returns forbidden when the caller does not own the remote-content configuration", async () => {
    vi.mocked(
      dependencies.remoteContentConfigurationRepository
        .getRemoteContentConfiguration,
    ).mockResolvedValue(
      ok(
        anRCConfiguration({
          userId: "another-user-id",
        }),
      ),
    );

    const result = await useCase(
      anInput({
        message: aMessage({
          content: {
            third_party_data: aThirdPartyData(),
          },
        }),
        permissions: permissions(
          "ApiMessageWrite",
          "ApiThirdPartyMessageWrite",
        ),
      }),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expectNoPersistence(dependencies);
  });

  it("accepts ownership when the APIM user id is not a resource path", async () => {
    const result = await useCase(
      anInput({
        message: aMessage({
          content: {
            third_party_data: aThirdPartyData(),
          },
        }),
        permissions: permissions(
          "ApiMessageWrite",
          "ApiThirdPartyMessageWrite",
        ),
        userId: "a-user-id",
      }),
    );

    expect(result.isOk()).toBe(true);
  });

  it("returns forbidden for STANDARD messages with attachments", async () => {
    const result = await useCase(
      anInput({
        message: aMessage({
          content: {
            third_party_data: aThirdPartyData({
              has_attachments: true,
            }),
          },
        }),
        permissions: permissions(
          "ApiMessageWrite",
          "ApiThirdPartyMessageWrite",
        ),
      }),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expectNoPersistence(dependencies);
  });

  it("allows attachments for ADVANCED messages", async () => {
    const result = await useCase(
      anInput({
        message: aMessage({
          content: {
            third_party_data: aThirdPartyData({
              has_attachments: true,
            }),
          },
          feature_level_type: "ADVANCED",
        }),
        permissions: permissions("ApiMessageWrite", "ApiMessageWriteAdvanced"),
      }),
    );

    expect(result.isOk()).toBe(true);
  });

  it("allows a limited sender to write to an authorized recipient", async () => {
    const result = await useCase(
      anInput({
        permissions: permissions("ApiLimitedMessageWrite"),
      }),
    );

    expect(result.isOk()).toBe(true);
  });

  it("returns forbidden when a limited sender targets an unauthorized recipient", async () => {
    dependencies = makeDependencies(
      aService({
        authorized_recipients: [anotherFiscalCode],
      }),
    );
    useCase = makeUseCase(dependencies);

    const result = await useCase(
      anInput({
        permissions: permissions("ApiLimitedMessageWrite"),
      }),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expect(dependencies.generateMessageId).toHaveBeenCalledOnce();
    expectNoPersistence(dependencies);
  });

  it("gives limited permission precedence over unrestricted permission", async () => {
    dependencies = makeDependencies(
      aService({
        authorized_recipients: [anotherFiscalCode],
      }),
    );
    useCase = makeUseCase(dependencies);

    const result = await useCase(
      anInput({
        permissions: permissions("ApiLimitedMessageWrite", "ApiMessageWrite"),
      }),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expectNoPersistence(dependencies);
  });

  it("returns forbidden when neither base write permission is present", async () => {
    const result = await useCase(
      anInput({
        permissions: permissions(),
      }),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expectNoPersistence(dependencies);
  });

  it("allows a payment equal to the service limit", async () => {
    const result = await useCase(
      anInput({
        message: aMessage({
          content: {
            payment_data: {
              amount: 10_000,
              invalid_after_due_date: false,
              notice_number: "012345678901234567",
            },
          },
        }),
      }),
    );

    expect(result.isOk()).toBe(true);
  });

  it("returns validation error when payment exceeds the service limit", async () => {
    const result = await useCase(
      anInput({
        message: aMessage({
          content: {
            payment_data: {
              amount: 10_001,
              invalid_after_due_date: false,
              notice_number: "012345678901234567",
            },
          },
        }),
      }),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ValidationError);
    expect(result._unsafeUnwrapErr().message).toContain(
      "exceeds the maximum allowed",
    );
    expect(dependencies.generateMessageId).toHaveBeenCalledOnce();
    expectNoPersistence(dependencies);
  });

  it.each([
    new GenericError("metadata create failed"),
    new TooManyRequestsError(),
  ])("propagates metadata persistence errors", async (error) => {
    vi.mocked(
      dependencies.messageMetadataRepository.createMessageMetadata,
    ).mockResolvedValue(err(error));

    const result = await useCase(anInput());

    expect(result._unsafeUnwrapErr()).toBe(error);
    expect(
      dependencies.processingMessagePayloadStore.savePayload,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.messageCreatedEventPublisher.publish,
    ).not.toHaveBeenCalled();
  });

  it("maps processing-payload persistence errors and tracks them", async () => {
    const error = new GenericError("blob unavailable");
    vi.mocked(
      dependencies.processingMessagePayloadStore.savePayload,
    ).mockResolvedValue(err(error));

    const result = await useCase(anInput());

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toContain(
      "Unable to store processing message",
    );
    expect(dependencies.trackEvent).toHaveBeenCalledWith({
      name: "CreateMessageUseCase.saveProcessingMessage.failed",
      properties: {
        errorMessage: error.message,
        messageId,
        serviceId,
      },
    });
    expect(
      dependencies.messageCreatedEventPublisher.publish,
    ).not.toHaveBeenCalled();
  });

  it("propagates event publication errors and tracks them", async () => {
    const error = new GenericError("queue unavailable");
    vi.mocked(
      dependencies.messageCreatedEventPublisher.publish,
    ).mockResolvedValue(err(error));

    const result = await useCase(anInput());

    expect(result._unsafeUnwrapErr()).toBe(error);
    expect(dependencies.trackEvent).toHaveBeenCalledWith({
      name: "CreateMessageUseCase.publishCreatedMessage.failed",
      properties: {
        errorMessage: error.message,
        messageId,
        serviceId,
      },
    });
  });

  it("queries the service using the APIM subscription id", async () => {
    await useCase(anInput());

    expect(
      dependencies.servicesCmsRepository.getServiceCmsDetails,
    ).toHaveBeenCalledWith(serviceId);
  });

  it("stores the path fiscal code as a branded value", async () => {
    const pathFiscalCode: FiscalCode =
      fiscalCodeSchema.parse("VRDLGI80A01H501U");

    await useCase(
      anInput({
        fiscalCode: pathFiscalCode,
      }),
    );

    expect(
      dependencies.messageMetadataRepository.createMessageMetadata,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        fiscalCode: pathFiscalCode,
      }),
    );
  });

  it("accepts a branded IPv4 client address", async () => {
    const anotherClientIp: ClientIp = clientIpSchema.parse("192.0.2.100");

    const result = await useCase(
      anInput({
        clientIp: anotherClientIp,
      }),
    );

    expect(result.isOk()).toBe(true);
  });
});
