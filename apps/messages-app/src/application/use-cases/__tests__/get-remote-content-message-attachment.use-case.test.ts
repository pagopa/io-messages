import { FiscalCodeSchema, NotFoundError } from "@pagopa/hexagonal-core";
import { anAssertionRef } from "io-messages-common/adapters/lollipop/__mocks__/lollipop";
import { lollipopHeadersSchema } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { fiscalCodeSchema as remoteFiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MessageContentRepository } from "../../ports/message-content.js";
import type { MessageMetadataRepository } from "../../ports/message-metadata.js";
import type { RCConfiguration } from "../../ports/rc-configuration.js";
import type { RemoteContentProxy } from "../../ports/remote-content-proxy.js";
import type { BuildLollipopHeadersUseCase } from "../build-lollipop-headers.use-case.js";

import { RCConfigurationRepository } from "../../ports/rc-configuration.js";
import {
  RemoteContentAttachmentUnsupportedMediaTypeError,
  RemoteContentServiceUnavailableError,
} from "../../ports/remote-content-message-attachment.js";
import { makeGetRemoteContentMessageAttachmentUseCase } from "../get-remote-content-message-attachment.use-case.js";

const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
const remoteFiscalCode = remoteFiscalCodeSchema.parse("RSSMRA80A01H501U");
const senderServiceId = "01JHYBR5JZCS6K0DT7M1EV8N2F";
const pnServiceId = "pn-service-id";
const configurationId = "01HAQ4HYBR5JZCS6K0DT7M1EV8";
const attachmentUrl =
  "delivery/notifications/received/IUN/attachments/documents/0?download=true";
const attachment = Buffer.from("%PDF-1.7 attachment bytes");
const lollipopRequestHeaders = {
  signature: "sig1=:YQ==:",
  "signature-input":
    'sig1=("x-pagopa-lollipop-original-method" "x-pagopa-lollipop-original-url");created=1;keyid="sha256-thumbprint"',
  "x-pagopa-lollipop-original-method": "GET",
  "x-pagopa-lollipop-original-url": "https://api.example.com/attachment",
};
const fullLollipopHeaders = lollipopHeadersSchema.parse({
  ...lollipopRequestHeaders,
  "x-pagopa-lollipop-assertion-ref": "sha256-thumbprint",
  "x-pagopa-lollipop-assertion-type": "OIDC",
  "x-pagopa-lollipop-auth-jwt": "lc-auth-token",
  "x-pagopa-lollipop-public-key": "public-key",
  "x-pagopa-lollipop-user-id": remoteFiscalCode,
});

const metadataRepository = {
  getMessageMetadataByFiscalCodeAndId: vi.fn(),
} as unknown as MessageMetadataRepository;
const contentRepository = {
  getMessageContentById: vi.fn(),
} as unknown as MessageContentRepository;
const getRemoteContentConfiguration = vi.fn();
const remoteContentProxy = {
  getRemoteContentMessageAttachment: vi.fn(),
} as unknown as RemoteContentProxy;
const buildLollipopHeaders = vi.fn<BuildLollipopHeadersUseCase>();
const serviceToRCMap = new Map<string, string>();

const makeMetadata = (serviceId = senderServiceId) => ({
  createdAt: "2024-01-01T00:00:00.000Z",
  featureLevelType: "STANDARD" as const,
  fiscalCode: remoteFiscalCode,
  id: messageId,
  indexedId: messageId,
  isPending: false,
  senderServiceId: serviceId,
  senderUserId: "sender",
  timeToLiveSeconds: 3600,
});

const makeContent = (thirdPartyMessageId = "third-party-message-id") => ({
  markdown: "a".repeat(80),
  subject: "a valid subject",
  third_party_data: {
    configuration_id: configurationId,
    has_attachments: true,
    has_remote_content: true,
    id: thirdPartyMessageId,
  },
});

const anRCConfiguration = (
  overrides: Partial<RCConfiguration> = {},
): RCConfiguration => ({
  configurationId,
  description: "description",
  disableLollipopFor: [],
  hasPrecondition: "NEVER",
  id: configurationId,
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
  makeGetRemoteContentMessageAttachmentUseCase(
    metadataRepository,
    contentRepository,
    { getRemoteContentConfiguration } as unknown as RCConfigurationRepository,
    remoteContentProxy,
    buildLollipopHeaders,
    serviceToRCMap,
  );

beforeEach(() => {
  vi.clearAllMocks();
  serviceToRCMap.clear();
  vi.mocked(
    metadataRepository.getMessageMetadataByFiscalCodeAndId,
  ).mockResolvedValue(ok(makeMetadata()));
  vi.mocked(contentRepository.getMessageContentById).mockResolvedValue(
    ok(makeContent()),
  );
  vi.mocked(getRemoteContentConfiguration).mockResolvedValue(
    ok(anRCConfiguration()),
  );
  vi.mocked(
    remoteContentProxy.getRemoteContentMessageAttachment,
  ).mockResolvedValue(ok(attachment));
  vi.mocked(buildLollipopHeaders).mockResolvedValue(ok(fullLollipopHeaders));
});

describe("makeGetRemoteContentMessageAttachmentUseCase", () => {
  it("passes the attachment path and query to the generic provider", async () => {
    const result = await makeUseCase()({
      attachmentUrl,
      fiscalCode,
      messageId,
    });

    expect(result.isOk()).toBe(true);
    expect(
      metadataRepository.getMessageMetadataByFiscalCodeAndId,
    ).toHaveBeenCalledWith(fiscalCode, messageId);
    expect(contentRepository.getMessageContentById).toHaveBeenCalledWith(
      messageId,
    );
    expect(
      remoteContentProxy.getRemoteContentMessageAttachment,
    ).toHaveBeenCalledWith({
      attachmentUrl,
      fiscalCode,
      lollipopHeaders: undefined,
      rcConfiguration: anRCConfiguration(),
      senderServiceId,
      thirdPartyMessageId: "third-party-message-id",
    });
  });

  it("uses the SEND provider based on sender service ID", async () => {
    vi.mocked(
      metadataRepository.getMessageMetadataByFiscalCodeAndId,
    ).mockResolvedValueOnce(ok(makeMetadata(pnServiceId)));
    vi.mocked(contentRepository.getMessageContentById).mockResolvedValueOnce(
      ok(makeContent("send-iun")),
    );

    const result = await makeUseCase()({
      attachmentUrl,
      fiscalCode,
      messageId,
    });

    expect(result.isOk()).toBe(true);
    expect(
      remoteContentProxy.getRemoteContentMessageAttachment,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        senderServiceId: pnServiceId,
        thirdPartyMessageId: "send-iun",
      }),
    );
  });

  it("builds Lollipop headers only when required", async () => {
    vi.mocked(getRemoteContentConfiguration).mockResolvedValueOnce(
      ok(anRCConfiguration({ isLollipopEnabled: true })),
    );

    const result = await makeUseCase()({
      assertionRef: anAssertionRef,
      attachmentUrl,
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
    expect(
      remoteContentProxy.getRemoteContentMessageAttachment,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ lollipopHeaders: fullLollipopHeaders }),
    );
  });

  it("returns 415-class error for non-PDF attachment bytes", async () => {
    vi.mocked(
      remoteContentProxy.getRemoteContentMessageAttachment,
    ).mockResolvedValueOnce(ok(Buffer.from("not a PDF")));

    const result = await makeUseCase()({
      attachmentUrl,
      fiscalCode,
      messageId,
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(
      RemoteContentAttachmentUnsupportedMediaTypeError,
    );
  });

  it("preserves not-found and service-unavailable provider errors", async () => {
    vi.mocked(
      remoteContentProxy.getRemoteContentMessageAttachment,
    ).mockResolvedValueOnce(err(new NotFoundError("attachment", "missing")));

    const notFound = await makeUseCase()({
      attachmentUrl,
      fiscalCode,
      messageId,
    });
    expect(notFound._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);

    vi.mocked(
      remoteContentProxy.getRemoteContentMessageAttachment,
    ).mockResolvedValueOnce(
      err(new RemoteContentServiceUnavailableError("45")),
    );
    const unavailable = await makeUseCase()({
      attachmentUrl,
      fiscalCode,
      messageId,
    });
    expect(unavailable._unsafeUnwrapErr()).toBeInstanceOf(
      RemoteContentServiceUnavailableError,
    );
  });
});
