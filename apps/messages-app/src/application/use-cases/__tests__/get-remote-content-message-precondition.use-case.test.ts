import type { LollipopRequiredHeaders } from "io-messages-common/adapters/lollipop/definitions/request-headers";
import type { RCConfiguration } from "io-messages-common/domain/remote-content";

import {
  FiscalCodeSchema,
  ForbiddenError,
  GenericError,
  NotFoundError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MessageContentRepository } from "../../ports/message-content.js";
import type { MessageMetadataRepository } from "../../ports/message-metadata.js";
import type { RCConfigurationRepository } from "../../ports/rc-configuration.js";
import type { RemoteContentProxy } from "../../ports/remote-content-proxy.js";
import type { BuildLollipopHeadersUseCase } from "../build-lollipop-headers.use-case.js";

import { makeGetRemoteContentMessagePreconditionUseCase } from "../get-remote-content-message-precondition.use-case.js";

const messageId = "01JAQ4HYBR5JZCS6K0DT7M1EV8";
const configurationId = "01JAQ4HYBR5JZCS6K0DT7M1EV9";
const serviceId = "01JHYBR5JZCS6K0DT7M1EV8N2F";
const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
const precondition = { markdown: "a precondition", title: "a title" };

const lollipopRequestHeaders = {
  signature: "sig1=:aSignature:",
  "signature-input":
    'sig1=("x-pagopa-lollipop-original-method" "x-pagopa-lollipop-original-url"); created=1618884475; keyid="6LvipIvFuhyorHpUqK3HjySC5Y6gshXHFBhU9EJ4DoM="',
  "x-pagopa-lollipop-original-method": "GET",
  "x-pagopa-lollipop-original-url": "https://api.example.com/messages",
} as unknown as LollipopRequiredHeaders;

const lollipopHeaders = { "x-pagopa-lollipop-user-id": fiscalCode };

const anRCConfiguration = (
  overrides: Partial<RCConfiguration> = {},
): RCConfiguration => ({
  configurationId,
  description: "description",
  disableLollipopFor: [],
  hasPrecondition: "ALWAYS",
  id: configurationId,
  isLollipopEnabled: false,
  name: "name",
  userId: "user",
  ...overrides,
});

const metadataRepository = {
  getMessageMetadataByFiscalCodeAndId: vi.fn(),
} as unknown as MessageMetadataRepository;

const contentRepository = {
  getMessageContentById: vi.fn(),
} as unknown as MessageContentRepository;

const rcConfigurationRepository = {
  getRemoteContentConfiguration: vi.fn(),
} as unknown as RCConfigurationRepository;

const proxy = {
  getRemoteContentMessagePrecondition: vi.fn(),
} as unknown as RemoteContentProxy;

const buildLollipopHeaders = vi.fn() as unknown as BuildLollipopHeadersUseCase &
  ReturnType<typeof vi.fn>;

const serviceToRcMap = new Map<string, string>();

const useCase = makeGetRemoteContentMessagePreconditionUseCase(
  metadataRepository,
  contentRepository,
  rcConfigurationRepository,
  proxy,
  buildLollipopHeaders,
  serviceToRcMap,
);

const input = {
  assertionRef: undefined,
  fiscalCode,
  lollipopRequestHeaders: undefined,
  messageId,
};

const setContent = (thirdPartyData: unknown) =>
  vi.mocked(contentRepository.getMessageContentById).mockResolvedValue(
    ok({
      markdown: "a".repeat(80),
      subject: "a valid subject",
      third_party_data: thirdPartyData,
    } as never),
  );

beforeEach(() => {
  vi.resetAllMocks();
  serviceToRcMap.clear();
  vi.mocked(
    metadataRepository.getMessageMetadataByFiscalCodeAndId,
  ).mockResolvedValue(ok({ senderServiceId: serviceId } as never));
  setContent({ configuration_id: configurationId, id: "tp-id" });
  vi.mocked(
    rcConfigurationRepository.getRemoteContentConfiguration,
  ).mockResolvedValue(ok(anRCConfiguration()));
  vi.mocked(proxy.getRemoteContentMessagePrecondition).mockResolvedValue(
    ok(precondition as never),
  );
});

describe("makeGetRemoteContentMessagePreconditionUseCase", () => {
  it("calls the proxy without lollipop headers when lollipop is disabled", async () => {
    const result = await useCase({
      ...input,
      lollipopRequestHeaders: { signature: "malformed" },
    });

    expect(result._unsafeUnwrap()).toEqual(precondition);
    expect(proxy.getRemoteContentMessagePrecondition).toHaveBeenCalledWith({
      fiscalCode,
      lollipopHeaders: undefined,
      rcConfiguration: anRCConfiguration(),
      senderServiceId: serviceId,
      thirdPartyMessageId: "tp-id",
    });
    expect(buildLollipopHeaders).not.toHaveBeenCalled();
  });

  it("returns ValidationError when the message has no third party data", async () => {
    setContent(undefined);

    const result = await useCase(input);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ValidationError);
  });

  it("falls back to the service to RC map for the configuration id", async () => {
    setContent({ id: "tp-id" });
    serviceToRcMap.set(serviceId, configurationId);

    await useCase(input);

    expect(
      rcConfigurationRepository.getRemoteContentConfiguration,
    ).toHaveBeenCalledWith(configurationId);
  });

  it("returns GenericError when no configuration can be resolved", async () => {
    setContent({ id: "tp-id" });

    const result = await useCase(input);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("returns the metadata error", async () => {
    vi.mocked(
      metadataRepository.getMessageMetadataByFiscalCodeAndId,
    ).mockResolvedValue(err(new NotFoundError("Message", "missing")));

    const result = await useCase(input);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it("builds lollipop headers and forwards them when lollipop is enabled", async () => {
    vi.mocked(
      rcConfigurationRepository.getRemoteContentConfiguration,
    ).mockResolvedValue(ok(anRCConfiguration({ isLollipopEnabled: true })));
    buildLollipopHeaders.mockResolvedValue(ok(lollipopHeaders));

    const result = await useCase({ ...input, lollipopRequestHeaders });

    expect(result.isOk()).toBe(true);
    expect(buildLollipopHeaders).toHaveBeenCalledWith({
      assertionRef: undefined,
      fiscalCode,
      requestHeaders: lollipopRequestHeaders,
    });
    expect(proxy.getRemoteContentMessagePrecondition).toHaveBeenCalledWith(
      expect.objectContaining({ lollipopHeaders }),
    );
  });

  it("skips lollipop when it is disabled for the fiscal code", async () => {
    vi.mocked(
      rcConfigurationRepository.getRemoteContentConfiguration,
    ).mockResolvedValue(
      ok(
        anRCConfiguration({
          disableLollipopFor: [fiscalCode],
          isLollipopEnabled: true,
        }),
      ),
    );

    await useCase(input);

    expect(buildLollipopHeaders).not.toHaveBeenCalled();
  });

  it("returns GenericError when lollipop is required but headers are missing", async () => {
    vi.mocked(
      rcConfigurationRepository.getRemoteContentConfiguration,
    ).mockResolvedValue(ok(anRCConfiguration({ isLollipopEnabled: true })));

    const result = await useCase(input);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(proxy.getRemoteContentMessagePrecondition).not.toHaveBeenCalled();
  });

  it("returns GenericError when lollipop is required but headers are invalid", async () => {
    vi.mocked(
      rcConfigurationRepository.getRemoteContentConfiguration,
    ).mockResolvedValue(ok(anRCConfiguration({ isLollipopEnabled: true })));

    const result = await useCase({
      ...input,
      lollipopRequestHeaders: { signature: "malformed" },
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(buildLollipopHeaders).not.toHaveBeenCalled();
  });

  it("returns the lollipop error", async () => {
    vi.mocked(
      rcConfigurationRepository.getRemoteContentConfiguration,
    ).mockResolvedValue(ok(anRCConfiguration({ isLollipopEnabled: true })));
    buildLollipopHeaders.mockResolvedValue(err(new ForbiddenError()));

    const result = await useCase({ ...input, lollipopRequestHeaders });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("forwards proxy errors", async () => {
    vi.mocked(proxy.getRemoteContentMessagePrecondition).mockResolvedValue(
      err(new ForbiddenError()),
    );

    const result = await useCase(input);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
  });
});
