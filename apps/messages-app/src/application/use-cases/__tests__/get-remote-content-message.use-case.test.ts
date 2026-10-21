import { FiscalCodeSchema, GenericError } from "@pagopa/hexagonal-core";
import {
  aSignatureInput,
  anAssertionRef,
} from "io-messages-common/adapters/lollipop/__mocks__/lollipop";
import { lollipopHeadersSchema } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { fiscalCodeSchema as remoteFiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MessageContentRepository } from "../../ports/message-content.js";
import type { MessageMetadataRepository } from "../../ports/message-metadata.js";
import type { RCConfiguration } from "../../ports/rc-configuration.js";
import type { RemoteContentProxy } from "../../ports/remote-content-proxy.js";
import type { BuildLollipopHeadersUseCase } from "../build-lollipop-headers.use-case.js";

import { LollipopHeadersBuildError } from "../../ports/lc-params.js";
import { RCConfigurationRepository } from "../../ports/rc-configuration.js";
import { RemoteContentMessageBadGatewayError } from "../../ports/remote-content-message.js";
import { makeGetRemoteContentMessageUseCase } from "../get-remote-content-message.use-case.js";

const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
const remoteFiscalCode = remoteFiscalCodeSchema.parse("RSSMRA80A01H501U");
const serviceId = "01JHYBR5JZCS6K0DT7M1EV8N2F";
const pnServiceId = "pn-service-id";
const standardConfigurationId = "01HAQ4HYBR5JZCS6K0DT7M1EV8";
const lollipopRequestHeaders = {
  signature: "sig1=:YQ==:",
  "signature-input": aSignatureInput,
  "x-pagopa-lollipop-original-method": "GET",
  "x-pagopa-lollipop-original-url": "https://api.example.com/messages",
};
const fullLollipopHeaders = lollipopHeadersSchema.parse({
  ...lollipopRequestHeaders,
  "x-pagopa-lollipop-assertion-ref": anAssertionRef,
  "x-pagopa-lollipop-assertion-type": "OIDC",
  "x-pagopa-lollipop-auth-jwt": "lc-auth-token",
  "x-pagopa-lollipop-public-key": "public-key",
  "x-pagopa-lollipop-user-id": remoteFiscalCode,
});

const rcConfigurationRepository = {
  getRemoteContentConfiguration: vi.fn(),
} as unknown as RCConfigurationRepository;
const messageMetadataRepository = {
  getMessageMetadataByFiscalCodeAndId: vi.fn(),
} as unknown as MessageMetadataRepository;
const messageContentRepository = {
  getMessageContentById: vi.fn(),
} as unknown as MessageContentRepository;

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
const buildLollipopHeaders = vi.fn<BuildLollipopHeadersUseCase>();

const makeContent = (thirdPartyMessageId = "third-party-message-id") => ({
  markdown: "a".repeat(80),
  subject: "a valid subject",
  third_party_data: {
    configuration_id: standardConfigurationId,
    has_attachments: false,
    has_remote_content: true,
    id: thirdPartyMessageId,
  },
});

const makeMetadata = (senderServiceId = serviceId) => ({
  createdAt: "2024-01-01T00:00:00.000Z",
  featureLevelType: "STANDARD" as const,
  fiscalCode: remoteFiscalCode,
  id: messageId,
  indexedId: messageId,
  isPending: false,
  senderServiceId,
  senderUserId: "sender",
  timeToLiveSeconds: 3600,
});

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
    messageMetadataRepository,
    messageContentRepository,
    rcConfigurationRepository,
    remoteContentProxy,
    buildLollipopHeaders,
    pnServiceId,
    serviceToRcMap,
  );

beforeEach(() => {
  vi.clearAllMocks();
  serviceToRcMap.clear();
  vi.mocked(
    messageMetadataRepository.getMessageMetadataByFiscalCodeAndId,
  ).mockResolvedValue(ok(makeMetadata()));
  vi.mocked(messageContentRepository.getMessageContentById).mockResolvedValue(
    ok(makeContent()),
  );
  vi.mocked(
    rcConfigurationRepository.getRemoteContentConfiguration,
  ).mockResolvedValue(ok(anRCConfiguration()));
  vi.mocked(remoteContentProxy.getRemoteContentMessage).mockResolvedValue(
    ok(genericRemoteMessage),
  );
  vi.mocked(buildLollipopHeaders).mockResolvedValue(ok(fullLollipopHeaders));
});

describe("makeGetRemoteContentMessageUseCase", () => {
  it("calls the proxy with the message provider context", async () => {
    const result = await makeUseCase()({ fiscalCode, messageId });

    expect(result.isOk()).toBe(true);
    expect(
      messageMetadataRepository.getMessageMetadataByFiscalCodeAndId,
    ).toHaveBeenCalledWith(fiscalCode, messageId);
    expect(messageContentRepository.getMessageContentById).toHaveBeenCalledWith(
      messageId,
    );
    expect(remoteContentProxy.getRemoteContentMessage).toHaveBeenCalledWith({
      assertionRef: undefined,
      fiscalCode,
      lollipopRequestHeaders: undefined,
      rcConfiguration: anRCConfiguration(),
      senderServiceId: serviceId,
      thirdPartyMessageId: "third-party-message-id",
    });
  });

  it("passes SEND notification data through unchanged", async () => {
    vi.mocked(
      messageMetadataRepository.getMessageMetadataByFiscalCodeAndId,
    ).mockResolvedValueOnce(ok(makeMetadata(pnServiceId)));
    vi.mocked(
      messageContentRepository.getMessageContentById,
    ).mockResolvedValueOnce(ok(makeContent("pn-iun")));
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

  it.each([
    {
      details: {
        markdown: "b".repeat(10_001),
        subject: "remote subject",
      },
      error: "MARKDOWN_VALIDATION_ERROR",
    },
    {
      details: {
        markdown: "b".repeat(80),
        subject: "s".repeat(122),
      },
      error: "SUBJECT_VALIDATION_ERROR",
    },
  ])(
    "returns bad gateway for out-of-range generic fields: $error",
    async ({ details, error }) => {
      vi.mocked(
        remoteContentProxy.getRemoteContentMessage,
      ).mockResolvedValueOnce(ok({ attachments: [], details }));

      const result = await makeUseCase()({ fiscalCode, messageId });

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(
        RemoteContentMessageBadGatewayError,
      );
      expect(result._unsafeUnwrapErr().message).toBe(error);
    },
  );

  it("builds full Lollipop headers when the configuration requires them", async () => {
    vi.mocked(
      rcConfigurationRepository.getRemoteContentConfiguration,
    ).mockResolvedValueOnce(ok(anRCConfiguration({ isLollipopEnabled: true })));

    const result = await makeUseCase()({
      assertionRef: anAssertionRef,
      fiscalCode,
      lollipopRequestHeaders,
      messageId,
    });

    expect(result.isOk()).toBe(true);
    expect(buildLollipopHeaders).toHaveBeenCalledExactlyOnceWith({
      assertionRef: anAssertionRef,
      fiscalCode: remoteFiscalCode,
      requestHeaders: lollipopRequestHeaders,
    });
    expect(remoteContentProxy.getRemoteContentMessage).toHaveBeenCalledWith(
      expect.objectContaining({ lollipopHeaders: fullLollipopHeaders }),
    );
  });

  it("does not build Lollipop headers for a user excluded by configuration", async () => {
    vi.mocked(
      rcConfigurationRepository.getRemoteContentConfiguration,
    ).mockResolvedValueOnce(
      ok(
        anRCConfiguration({
          disableLollipopFor: [remoteFiscalCode],
          isLollipopEnabled: true,
        }),
      ),
    );

    const result = await makeUseCase()({ fiscalCode, messageId });

    expect(result.isOk()).toBe(true);
    expect(buildLollipopHeaders).not.toHaveBeenCalled();
    expect(remoteContentProxy.getRemoteContentMessage).toHaveBeenCalledWith(
      expect.objectContaining({ lollipopHeaders: undefined }),
    );
  });

  it("maps missing required request headers to a generic internal error", async () => {
    vi.mocked(
      rcConfigurationRepository.getRemoteContentConfiguration,
    ).mockResolvedValueOnce(ok(anRCConfiguration({ isLollipopEnabled: true })));

    const result = await makeUseCase()({ fiscalCode, messageId });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(LollipopHeadersBuildError);
    expect(result._unsafeUnwrapErr().message).toContain("Bad request");
    expect(buildLollipopHeaders).not.toHaveBeenCalled();
    expect(remoteContentProxy.getRemoteContentMessage).not.toHaveBeenCalled();
  });

  it("maps Lollipop client failures to an internal error", async () => {
    vi.mocked(
      rcConfigurationRepository.getRemoteContentConfiguration,
    ).mockResolvedValueOnce(ok(anRCConfiguration({ isLollipopEnabled: true })));
    vi.mocked(buildLollipopHeaders).mockResolvedValueOnce(
      err(new GenericError("LC unavailable")),
    );

    const result = await makeUseCase()({
      assertionRef: anAssertionRef,
      fiscalCode,
      lollipopRequestHeaders,
      messageId,
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(LollipopHeadersBuildError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Error extracting lollipop locals",
    );
    expect(remoteContentProxy.getRemoteContentMessage).not.toHaveBeenCalled();
  });
});
