import type { RCConfiguration } from "io-messages-common/domain/remote-content";

import {
  FiscalCodeSchema,
  ForbiddenError,
  GenericError,
} from "@pagopa/hexagonal-core";
import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RemoteContentMessageRepository } from "../../../../application/ports/remote-content-message.js";
import type { RemoteContentMessageAttachmentRepository } from "../../../../application/ports/remote-content-message-attachment.js";
import type { RemoteContentMessagePreconditionRepository } from "../../../../application/ports/remote-content-message-precondition.js";
import type { RemoteContentProxyAttachmentRequest } from "../../../../application/ports/remote-content-proxy.js";

import { RemoteContentServiceUnavailableError } from "../../../../application/ports/remote-content-message-attachment.js";
import { RemoteContentProxyAdapter } from "../remote-content-proxy.adapter.js";

const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
const otherFiscalCode = FiscalCodeSchema.parse("RMLGNN97R06F158N");
const testUserFiscalCode = fiscalCodeSchema.parse("RSSMRA80A01H501U");
const pnServiceId = "send-service-id";
const prodEnvironment = {
  baseUrl: "https://provider.example/prod",
  detailsAuthentication: {
    headerKeyName: "x-prod-api-key",
    key: "prod-key",
    type: "API_KEY",
  },
};
const testEnvironment = {
  baseUrl: "https://provider.example/test",
  detailsAuthentication: {
    headerKeyName: "x-test-api-key",
    key: "test-key",
    type: "API_KEY",
  },
  testUsers: [testUserFiscalCode],
};
const rcConfiguration: RCConfiguration = {
  configurationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  description: "Remote content configuration",
  disableLollipopFor: [],
  hasPrecondition: "ALWAYS",
  id: "configuration-id",
  isLollipopEnabled: true,
  name: "Provider",
  prodEnvironment,
  testEnvironment,
  userId: "owner-id",
};
const request: RemoteContentProxyAttachmentRequest = {
  attachmentUrl: "documents/document.pdf?attachmentIdx=0",
  fiscalCode,
  lollipopHeaders: {
    signature: "sig1=:YWJjZA==:",
    "signature-input":
      'sig1=("x-pagopa-lollipop-original-method" "x-pagopa-lollipop-original-url")',
    "x-pagopa-lollipop-assertion-ref":
      "sha256-6LvipIvFuhyorHpUqK3HjySC5Y6gshXHFBhU9EJ4DoM=",
    "x-pagopa-lollipop-assertion-type": "OIDC",
    "x-pagopa-lollipop-auth-jwt": "a-bearer-token",
    "x-pagopa-lollipop-original-method": "GET",
    "x-pagopa-lollipop-original-url":
      "https://api.io.pagopa.it/api/v1/messages/message-id",
    "x-pagopa-lollipop-public-key": "a-public-key",
    "x-pagopa-lollipop-user-id": fiscalCode,
  },
  rcConfiguration,
  senderServiceId: "generic-service-id",
  thirdPartyMessageId: "third-party-message-id",
};
const repository = {
  getRemoteContentMessage:
    vi.fn<RemoteContentMessageRepository["getRemoteContentMessage"]>(),
  getRemoteContentMessageAttachment:
    vi.fn<
      RemoteContentMessageAttachmentRepository["getRemoteContentMessageAttachment"]
    >(),
  getRemoteContentMessagePrecondition:
    vi.fn<
      RemoteContentMessagePreconditionRepository["getRemoteContentMessagePrecondition"]
    >(),
};
const successResults = {
  getRemoteContentMessage: ok({ details: { subject: "Remote message" } }),
  getRemoteContentMessageAttachment: ok(Buffer.from("attachment content")),
  getRemoteContentMessagePrecondition: ok({
    markdown: "Precondition content",
    title: "Precondition",
  }),
};
const adapter = new RemoteContentProxyAdapter(repository, pnServiceId);
const methods = [
  "getRemoteContentMessage",
  "getRemoteContentMessageAttachment",
  "getRemoteContentMessagePrecondition",
] as const;

beforeEach(() => {
  vi.resetAllMocks();
  repository.getRemoteContentMessage.mockResolvedValue(
    successResults.getRemoteContentMessage,
  );
  repository.getRemoteContentMessageAttachment.mockResolvedValue(
    successResults.getRemoteContentMessageAttachment,
  );
  repository.getRemoteContentMessagePrecondition.mockResolvedValue(
    successResults.getRemoteContentMessagePrecondition,
  );
});

describe.each(methods)("RemoteContentProxyAdapter.%s", (method) => {
  it.each([
    {
      configuration: rcConfiguration,
      recipient: fiscalCode,
      selected: testEnvironment,
      title: "TEST for an allowlisted user",
    },
    {
      configuration: rcConfiguration,
      recipient: otherFiscalCode,
      selected: prodEnvironment,
      title: "PROD for a non-allowlisted user",
    },
    {
      configuration: { ...rcConfiguration, testEnvironment: undefined },
      recipient: fiscalCode,
      selected: prodEnvironment,
      title: "PROD when TEST is not configured",
    },
    {
      configuration: { ...rcConfiguration, prodEnvironment: undefined },
      recipient: fiscalCode,
      selected: testEnvironment,
      title: "TEST when PROD is not configured",
    },
  ])(
    "delegates only the requested operation to $title",
    async ({ configuration, recipient, selected }) => {
      const result = await adapter[method]({
        ...request,
        fiscalCode: recipient,
        rcConfiguration: configuration,
      });

      expect(result).toBe(successResults[method]);
      expect(repository[method]).toHaveBeenCalledExactlyOnceWith(
        new URL(selected.baseUrl),
        selected.detailsAuthentication,
        request.thirdPartyMessageId,
        ...(method === "getRemoteContentMessageAttachment"
          ? [request.attachmentUrl]
          : []),
        recipient,
        request.lollipopHeaders,
      );
      for (const otherMethod of methods.filter((name) => name !== method)) {
        expect(repository[otherMethod]).not.toHaveBeenCalled();
      }
    },
  );

  it("forwards absent Lollipop headers unchanged", async () => {
    await adapter[method]({ ...request, lollipopHeaders: undefined });

    expect(repository[method].mock.calls[0]?.at(-1)).toBeUndefined();
  });

  it.each([
    {
      configuration: { ...rcConfiguration, prodEnvironment: undefined },
      message: "PROD environment is not configured",
      recipient: otherFiscalCode,
    },
    {
      configuration: {
        ...rcConfiguration,
        prodEnvironment: undefined,
        testEnvironment: undefined,
      },
      message: "PROD environment is not configured",
      recipient: fiscalCode,
    },
    {
      configuration: {
        ...rcConfiguration,
        testEnvironment: { ...testEnvironment, baseUrl: "not-a-url" },
      },
      message: "TEST base URL is invalid",
      recipient: fiscalCode,
    },
    {
      configuration: {
        ...rcConfiguration,
        prodEnvironment: { ...prodEnvironment, baseUrl: "not-a-url" },
      },
      message: "PROD base URL is invalid",
      recipient: otherFiscalCode,
    },
    {
      configuration: {
        ...rcConfiguration,
        testEnvironment: {
          ...testEnvironment,
          baseUrl: "file:///private/config",
        },
      },
      message: "TEST base URL must use HTTP or HTTPS",
      recipient: fiscalCode,
    },
  ])(
    "returns a configuration error: $message",
    async ({ configuration, message, recipient }) => {
      const result = await adapter[method]({
        ...request,
        fiscalCode: recipient,
        rcConfiguration: configuration,
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
      expect(result._unsafeUnwrapErr().message).toContain(message);
      for (const repositoryMethod of methods) {
        expect(repository[repositoryMethod]).not.toHaveBeenCalled();
      }
    },
  );

  it("rejects SEND without falling back to the generic adapter", async () => {
    const result = await adapter[method]({
      ...request,
      senderServiceId: pnServiceId,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toContain(
      "SEND remote content integration is not available",
    );
    for (const repositoryMethod of methods) {
      expect(repository[repositoryMethod]).not.toHaveBeenCalled();
    }
  });

  it.each([new ForbiddenError(), new GenericError("Upstream failure")])(
    "preserves the downstream error Result unchanged",
    async (error) => {
      const failure = err(error);
      repository[method].mockResolvedValue(failure);

      await expect(adapter[method](request)).resolves.toBe(failure);
      expect(repository[method]).toHaveBeenCalledTimes(1);
    },
  );
});

it("preserves attachment retryAfter without retrying", async () => {
  const failure = err(new RemoteContentServiceUnavailableError("120"));
  repository.getRemoteContentMessageAttachment.mockResolvedValue(failure);

  const result = await adapter.getRemoteContentMessageAttachment(request);

  expect(result).toBe(failure);
  expect(result._unsafeUnwrapErr()).toHaveProperty("retryAfter", "120");
  expect(repository.getRemoteContentMessageAttachment).toHaveBeenCalledTimes(1);
});
