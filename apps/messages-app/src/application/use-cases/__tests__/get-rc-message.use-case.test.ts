import { FiscalCodeSchema } from "@pagopa/hexagonal-core";
import { fiscalCodeSchema as remoteFiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import { ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MessageContentRepository } from "../../ports/message-content.js";
import type { MessageMetadataRepository } from "../../ports/message-metadata.js";
import type { RCConfiguration } from "../../ports/rc-configuration.js";
import type { RemoteContentProxy } from "../../ports/remote-content-proxy.js";

import { RCConfigurationRepository } from "../../ports/rc-configuration.js";
import { RemoteContentMessageBadGatewayError } from "../../ports/remote-content-message.js";
import { makeGetRemoteContentMessageUseCase } from "../get-rc-message.use-case.js";

const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
const remoteFiscalCode = remoteFiscalCodeSchema.parse("RSSMRA80A01H501U");
const serviceId = "01JHYBR5JZCS6K0DT7M1EV8N2F";
const pnServiceId = "pn-service-id";
const standardConfigurationId = "01HAQ4HYBR5JZCS6K0DT7M1EV8";

const metadataRepository = {
  getMessageMetadataByFiscalCodeAndId: vi.fn().mockResolvedValue(
    ok({
      createdAt: "2024-01-01T00:00:00.000Z",
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

const contentRepository = {
  getMessageContentById: vi.fn().mockResolvedValue(
    ok({
      markdown: "a".repeat(80),
      subject: "a valid subject",
      third_party_data: {
        configuration_id: standardConfigurationId,
        has_attachments: false,
        has_remote_content: true,
        id: "third-party-message-id",
      },
    }),
  ),
} as unknown as MessageContentRepository;

const rcConfigurationRepository = {
  getRemoteContentConfiguration: vi.fn(),
} as unknown as RCConfigurationRepository;

const genericRemoteMessage = {
  attachments: [],
  details: {
    markdown: "b".repeat(80),
    subject: "remote subject",
  },
};

const remoteContentProxy = {
  getRemoteContentMessage: vi.fn(),
} as unknown as RemoteContentProxy;

const sendRemoteMessage = {
  attachments: [
    {
      category: "DOCUMENT",
      id: "pn-attachment",
      name: "notice.pdf",
      size: 123,
      url: "https://example.test/doc",
    },
  ],
  details: {
    abstract: "Notification abstract",
    iun: "pn-iun",
    notificationStatusHistory: [],
    recipients: [],
    subject: "PN subject",
    timeline: [{ category: "VIEWED" }],
  },
};

const serviceToRcMap = new Map<string, string>();

const anRCConfiguration = (
  overrides: Partial<RCConfiguration> = {},
): RCConfiguration => ({
  configurationId: standardConfigurationId,
  description: "description",
  disableLollipopFor: [],
  hasPrecondition: "ALWAYS",
  id: standardConfigurationId,
  isLollipopEnabled: false,
  name: "configuration",
  prodEnvironment: {
    baseUrl: "https://remote-content.example/",
    detailsAuthentication: {
      headerKeyName: "x-api-key",
      key: "api-key",
      type: "API_KEY",
    },
  },
  testEnvironment: {
    baseUrl: "https://remote-content-test.example/",
    detailsAuthentication: {
      headerKeyName: "x-api-key",
      key: "test-api-key",
      type: "API_KEY",
    },
    testUsers: [remoteFiscalCode],
  },
  userId: "user-id",
  ...overrides,
});

const makeUseCase = () =>
  makeGetRemoteContentMessageUseCase(
    metadataRepository,
    contentRepository,
    rcConfigurationRepository,
    remoteContentProxy,
    pnServiceId,
    serviceToRcMap,
  );

beforeEach(() => {
  vi.clearAllMocks();
  serviceToRcMap.clear();
  vi.mocked(
    rcConfigurationRepository.getRemoteContentConfiguration,
  ).mockResolvedValue(ok(anRCConfiguration()));
  vi.mocked(remoteContentProxy.getRemoteContentMessage).mockResolvedValue(
    ok(genericRemoteMessage),
  );
});

describe("makeGetRemoteContentMessageUseCase", () => {
  it("calls the proxy with the message provider context", async () => {
    const result = await makeUseCase()({ fiscalCode, messageId });

    expect(result.isOk()).toBe(true);
    expect(remoteContentProxy.getRemoteContentMessage).toHaveBeenCalledWith({
      fiscalCode,
      lollipopHeaders: undefined,
      rcConfiguration: anRCConfiguration(),
      senderServiceId: serviceId,
      thirdPartyMessageId: "third-party-message-id",
    });
  });

  it("passes SEND notification data through unchanged", async () => {
    vi.mocked(
      metadataRepository.getMessageMetadataByFiscalCodeAndId,
    ).mockResolvedValueOnce(
      ok({
        createdAt: "2024-01-01T00:00:00.000Z",
        featureLevelType: "STANDARD",
        fiscalCode,
        id: messageId,
        indexedId: messageId,
        isPending: false,
        senderServiceId: pnServiceId,
        senderUserId: "sender",
        timeToLiveSeconds: 3600,
      }),
    );
    vi.mocked(remoteContentProxy.getRemoteContentMessage).mockResolvedValueOnce(
      ok(sendRemoteMessage),
    );

    const result = await makeUseCase()({ fiscalCode, messageId });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().third_party_message).toEqual(
      sendRemoteMessage,
    );
  });

  it("returns bad gateway when required generic remote content is missing", async () => {
    vi.mocked(remoteContentProxy.getRemoteContentMessage).mockResolvedValueOnce(
      ok({ attachments: [] }),
    );

    const result = await makeUseCase()({ fiscalCode, messageId });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(
      RemoteContentMessageBadGatewayError,
    );
    expect(result._unsafeUnwrapErr().message).toBe(
      "REMOTE_CONTENT_NOT_PRESENT",
    );
  });
});
