/* eslint-disable @typescript-eslint/no-explicit-any */
import { Context } from "@azure/functions";
import { FeatureLevelTypeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/FeatureLevelType";
import { MessageModel } from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  IAzureApiAuthorization,
  UserGroup,
} from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_api_auth";
import { IAzureUserAttributes } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_user_attributes";
import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as fc from "fast-check";
import * as E from "fp-ts/lib/Either";
import { none, some } from "fp-ts/lib/Option";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { describe, expect, it, vi } from "vitest";

import {
  aFiscalCode,
  anAzureApiAuthorization,
  anAzureUserAttributes,
  anIncompleteService,
  anotherFiscalCode,
} from "../../../__mocks__/mocks";
import {
  aRCConfigurationResponse,
  aRCConfigurationResponse as anOwnedRCConfiguration,
} from "../../../__mocks__/remote-content";
import { createClient } from "../../../generated/remote-content/client";
import {
  alphaStringArb,
  featureLevelTypeArb,
  fiscalCodeArb,
  fiscalCodeArrayArb,
  fiscalCodeSetArb,
  maxAmountArb,
  messageTimeToLiveArb,
  newMessageWithPaymentDataArb,
} from "../../../utils/__tests__/arbitraries";
import {
  CreateMessageHandler,
  canPaymentAmount,
  canWriteMessage,
  createMessageDocument,
} from "../handler";
import { ApiNewMessageWithDefaults } from "../types";

const createContext = (): Context =>
  ({
    bindings: {},
    executionContext: { functionName: "funcname" },
    // eslint-disable no-console
    log: { ...console, verbose: vi.fn() },
  }) as unknown as Context;

const aSandboxFiscalCode = "AAAAAA12A12A111A" as NonEmptyString;

const mockTelemetryClient = {
  trackEvent: vi.fn(),
} as unknown as ReturnType<typeof initAppInsights>;

const mockSaveBlob = vi.fn(() => TE.of(O.some({} as any)));
const mockMessageModel = {
  create: vi.fn(() => TE.of({})),
} as unknown as MessageModel;

const anOtherRCConfiguration = {
  ...anOwnedRCConfiguration,
  configuration_id: "01HQRD0YCVDXF1XDW634N87XCH",
  user_id: "09876543210",
};

const remoteContentClient = createClient<"ApiKeyAuth">({
  baseUrl: "http://baseurl.com",
  fetchApi: fetch,
  withDefaults: (op) => (params) =>
    op({
      ...params,
      ApiKeyAuth: "mockApiKey",
    }),
});

describe("canWriteMessage", () => {
  it("should respond with ResponseErrorForbiddenNotAuthorizedForProduction when service is in no group", () => {
    fc.assert(
      fc.property(
        fiscalCodeArrayArb,
        fiscalCodeArb,
        fc.boolean(),
        (authorizedRecipients, recipient, isAuthorized) => {
          const response = canWriteMessage(
            new Set(), // no groups
            new Set(
              authorizedRecipients.concat(isAuthorized ? [recipient] : []),
            ), // any authorized recipient, possibly also the current one
            recipient, // one random recipient
          );
          expect(E.isLeft(response)).toBeTruthy();
          if (E.isLeft(response)) {
            expect(response.left.kind).toEqual(
              "IResponseErrorForbiddenNotAuthorizedForProduction",
            );
          }
        },
      ),
    );
  });

  it("should respond with ResponseErrorForbiddenNotAuthorizedForRecipient when service is trying to send message to an unauthorized recipient", () => {
    fc.assert(
      fc.property(
        fiscalCodeArrayArb,
        fiscalCodeArb,
        (authorizedRecipients, recipient) => {
          const response = canWriteMessage(
            new Set([UserGroup.ApiLimitedMessageWrite]),
            new Set(authorizedRecipients.filter((r) => r !== recipient)), // current recipient is not authorized
            recipient,
          );
          expect(E.isLeft(response)).toBeTruthy();
          if (E.isLeft(response)) {
            expect(response.left.kind).toEqual(
              "IResponseErrorForbiddenNotAuthorizedForRecipient",
            );
          }
        },
      ),
    );
  });

  it("should pass when service is trying to send message to an authorized recipient", () => {
    fc.assert(
      fc.property(
        fiscalCodeArrayArb,
        fiscalCodeArb,
        (authorizedRecipients, recipient) => {
          const response = canWriteMessage(
            new Set([UserGroup.ApiLimitedMessageWrite]),
            new Set([...authorizedRecipients, recipient]), // current recipient always authorized
            recipient,
          );
          expect(E.isRight(response)).toBeTruthy();
        },
      ),
    );
  });

  it("should pass when service can send messages to any recipient", () => {
    fc.assert(
      fc.property(
        fiscalCodeSetArb,
        fiscalCodeArb,
        (authorizedRecipients, recipient) => {
          const response = canWriteMessage(
            new Set([UserGroup.ApiMessageWrite]),
            authorizedRecipients,
            recipient,
          );
          expect(E.isRight(response)).toBeTruthy();
        },
      ),
    );
  });
});

describe("canPaymentAmount", () => {
  it("should authorize payment if under the allowed amount", () => {
    fc.assert(
      fc.property(
        newMessageWithPaymentDataArb,
        maxAmountArb,
        (message, maxAmount) => {
          const response = canPaymentAmount(message.content, maxAmount);
          if (message.content.payment_data.amount <= maxAmount) {
            expect(E.isRight(response)).toBeTruthy();
          } else {
            expect(E.isLeft(response)).toBeTruthy();
          }
        },
      ),
    );
  });
});

describe("createMessageDocument", () => {
  const messageIdArb = alphaStringArb(16);
  const senderUserIdArb = alphaStringArb(16);
  const serviceIdArb = alphaStringArb(16);

  it("should create a Message document", async () => {
    await fc.assert(
      fc.asyncProperty(
        messageIdArb,
        senderUserIdArb,
        fiscalCodeArb,
        messageTimeToLiveArb,
        featureLevelTypeArb,
        serviceIdArb,
        async (
          messageId,
          senderUserId,
          fiscalCode,
          ttl,
          featureLevelType,
          senderServiceId,
        ) => {
          const mockMessageModel = {
            create: vi.fn(() => TE.of({})),
          } as unknown as MessageModel;
          const responseTask = createMessageDocument(
            messageId,
            mockMessageModel,
            senderUserId,
            fiscalCode,
            ttl,
            featureLevelType,
            senderServiceId,
          );

          const response = await responseTask();

          expect(mockMessageModel.create).toHaveBeenCalledTimes(1);
          expect(E.isRight(response)).toBeTruthy();
          if (E.isRight(response))
            expect(response.right).toMatchObject({
              featureLevelType,
              fiscalCode,
              id: messageId,
              indexedId: messageId,
              isPending: true,
              kind: "INewMessageWithoutContent",
              senderServiceId,
              senderUserId,
              timeToLiveSeconds: ttl,
            });
        },
      ),
      { verbose: true },
    );
  });
});

//eslint-disable-next-line max-lines-per-function
describe("CreateMessageHandler", () => {
  it("should return a validation error if fiscalcode is specified both in path and payload", async () => {
    await fc.assert(
      fc.asyncProperty(fiscalCodeArb, async (fiscalCode) => {
        const createMessageHandler = CreateMessageHandler(
          undefined as any,
          remoteContentClient,
          undefined as any,
          undefined as any,
          undefined as any,
          true,
          [],
          aSandboxFiscalCode,
        );

        const response = await createMessageHandler(
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          {
            fiscal_code: fiscalCode,
          } as any,
          some(fiscalCode),
        );

        expect(response.kind).toBe("IResponseErrorValidation");
      }),
    );
  });

  it("should return a validation error if fiscalcode is not specified in path nor payload", async () => {
    const createMessageHandler = CreateMessageHandler(
      undefined as any,
      remoteContentClient,
      undefined as any,
      undefined as any,
      undefined as any,
      true,
      [],
      aSandboxFiscalCode,
    );

    const response = await createMessageHandler(
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      {} as any,
      none,
    );

    expect(response.kind).toBe("IResponseErrorValidation");
  });

  it("should return IResponseErrorForbiddenNotAuthorizedForProduction if the service hasn't quality field", async () => {
    const mockAzureApiAuthorization: IAzureApiAuthorization = {
      groups: new Set([UserGroup.ApiMessageWrite]),
      kind: "IAzureApiAuthorization",
      subscriptionId: "" as NonEmptyString,
      userId: "" as NonEmptyString,
    };

    const mockAzureUserAttributes: IAzureUserAttributes = {
      email: "" as EmailString,
      kind: "IAzureUserAttributes",
      service: {
        ...anIncompleteService,
        authorizedRecipients: new Set([aFiscalCode]),
      } as IAzureUserAttributes["service"],
    };
    const mockGenerateObjId = vi
      .fn()
      .mockImplementationOnce(() => "mocked-message-id");
    const mockTelemetryClient = {
      trackEvent: vi.fn(),
    } as unknown as ReturnType<typeof initAppInsights>;

    const mockSaveBlob = vi.fn(() => TE.of(O.some({} as any)));
    const createMessageHandler = CreateMessageHandler(
      mockTelemetryClient,
      remoteContentClient,
      undefined as any,
      mockGenerateObjId,
      mockSaveBlob,
      true,
      [],
      aSandboxFiscalCode,
    );

    const response = await createMessageHandler(
      createContext(),
      mockAzureApiAuthorization,
      undefined as any,
      mockAzureUserAttributes,
      {
        content: {
          markdown: "md",
          subject: "subject",
        },
      } as ApiNewMessageWithDefaults,
      some(anotherFiscalCode),
    );

    expect(response.kind).toBe(
      "IResponseErrorForbiddenNotAuthorizedForRecipient",
    );
  });

  it("should call the mockSaveBlob using the value of the requireSecureChannels of the service if the value is not provided in the message", async () => {
    const mockGenerateObjId = vi
      .fn()
      .mockImplementationOnce(() => "mocked-message-id");

    const createMessageHandler = CreateMessageHandler(
      mockTelemetryClient,
      remoteContentClient,
      mockMessageModel,
      mockGenerateObjId,
      mockSaveBlob,
      true,
      [],
      aSandboxFiscalCode,
    );

    await createMessageHandler(
      createContext(),
      anAzureApiAuthorization,
      undefined as any,
      anAzureUserAttributes,
      {
        content: {
          markdown: "md",
          subject: "subject",
        },
      } as ApiNewMessageWithDefaults,
      some(anotherFiscalCode),
    );

    expect(mockSaveBlob).toBeCalledWith(
      expect.any(String),
      expect.objectContaining({
        senderMetadata: expect.objectContaining({
          requireSecureChannels: true,
        }),
      }),
    );
  });

  it("should call the mockSaveBlob using the value of the requireSecureChannels of the message if provided ignoring the value of the service", async () => {
    const mockGenerateObjId = vi
      .fn()
      .mockImplementationOnce(() => "mocked-message-id");

    const createMessageHandler = CreateMessageHandler(
      mockTelemetryClient,
      remoteContentClient,
      mockMessageModel,
      mockGenerateObjId,
      mockSaveBlob,
      true,
      [],
      aSandboxFiscalCode,
    );

    await createMessageHandler(
      createContext(),
      anAzureApiAuthorization,
      undefined as any,
      anAzureUserAttributes,
      {
        content: {
          markdown: "md",
          require_secure_channels: false,
          subject: "subject",
        },
      } as ApiNewMessageWithDefaults,
      some(anotherFiscalCode),
    );

    expect(mockSaveBlob).toBeCalledWith(
      expect.any(String),
      expect.objectContaining({
        senderMetadata: expect.objectContaining({
          requireSecureChannels: false,
        }),
      }),
    );
  });

  it("should return 403 error if the flag has_attachments is true but the message is not advanced", async () => {
    vi.spyOn(remoteContentClient, "getRCConfiguration").mockResolvedValueOnce({
      _tag: "Right",
      right: { headers: {}, status: 200, value: aRCConfigurationResponse },
    });

    const createMessageHandler = CreateMessageHandler(
      mockTelemetryClient,
      remoteContentClient,
      mockMessageModel,
      undefined as any,
      mockSaveBlob,
      true,
      [],
      aSandboxFiscalCode,
    );

    const r = await createMessageHandler(
      createContext(),
      anAzureApiAuthorization,
      undefined as any,
      anAzureUserAttributes,
      {
        content: {
          markdown: "md",
          subject: "subject",
          third_party_data: {
            configuration_id: anOwnedRCConfiguration.configuration_id,
            has_attachments: true,
          },
        },
        feature_level_type: FeatureLevelTypeEnum.STANDARD,
      } as ApiNewMessageWithDefaults,
      some(anotherFiscalCode),
    );

    expect(r.kind).toBe("IResponseErrorForbiddenNotAuthorizedForAttachments");
    expect(r.detail).toBe(
      "Attachments call forbidden: You are not allowed to send messages with attachmens with STANDARD messages, please use ADVANCED",
    );
  });

  it("should return 403 error if the flag has_attachments true but the feature_level_type is not provided", async () => {
    vi.spyOn(remoteContentClient, "getRCConfiguration").mockResolvedValueOnce({
      _tag: "Right",
      right: { headers: {}, status: 200, value: aRCConfigurationResponse },
    });

    const createMessageHandler = CreateMessageHandler(
      mockTelemetryClient,
      remoteContentClient,
      mockMessageModel,
      undefined as any,
      mockSaveBlob,
      true,
      [],
      aSandboxFiscalCode,
    );

    const r = await createMessageHandler(
      createContext(),
      anAzureApiAuthorization,
      undefined as any,
      anAzureUserAttributes,
      {
        content: {
          markdown: "md",
          subject: "subject",
          third_party_data: {
            configuration_id: anOwnedRCConfiguration.configuration_id,
            has_attachments: true,
          },
        },
      } as ApiNewMessageWithDefaults,
      some(anotherFiscalCode),
    );

    expect(r.kind).toBe("IResponseErrorForbiddenNotAuthorizedForAttachments");
    expect(r.detail).toBe(
      "Attachments call forbidden: You are not allowed to send messages with attachmens with STANDARD messages, please use ADVANCED",
    );
  });

  it("should return 200 ok if a configuration_id is provided and the configuration is of the current user", async () => {
    vi.spyOn(remoteContentClient, "getRCConfiguration").mockResolvedValueOnce({
      _tag: "Right",
      right: { headers: {}, status: 200, value: aRCConfigurationResponse },
    });

    const mockGenerateObjId = vi
      .fn()
      .mockImplementationOnce(() => "mocked-message-id");

    const createMessageHandler = CreateMessageHandler(
      mockTelemetryClient,
      remoteContentClient,
      mockMessageModel,
      mockGenerateObjId,
      mockSaveBlob,
      true,
      [],
      aSandboxFiscalCode,
    );

    const r = await createMessageHandler(
      createContext(),
      anAzureApiAuthorization,
      undefined as any,
      anAzureUserAttributes,
      {
        content: {
          markdown: "md",
          subject: "subject",
          third_party_data: {
            configuration_id: anOwnedRCConfiguration.configuration_id,
            has_attachments: false,
          },
        },
      } as ApiNewMessageWithDefaults,
      some(anotherFiscalCode),
    );

    expect(r.kind).toBe("IResponseSuccessRedirectToResource");
  });

  it("should return 403 ok if a configuration_id is provided and the configuration is NOT of the current user", async () => {
    const anotherUserId = "01234567891" as NonEmptyString;
    vi.spyOn(remoteContentClient, "getRCConfiguration").mockResolvedValueOnce({
      _tag: "Right",
      right: {
        headers: {},
        status: 200,
        value: {
          ...aRCConfigurationResponse,
          user_id: anotherUserId,
        },
      },
    });

    const mockGenerateObjId = vi
      .fn()
      .mockImplementationOnce(() => "mocked-message-id");

    const createMessageHandler = CreateMessageHandler(
      mockTelemetryClient,
      remoteContentClient,
      mockMessageModel,
      mockGenerateObjId,
      mockSaveBlob,
      true,
      [],
      aSandboxFiscalCode,
    );

    const r = await createMessageHandler(
      createContext(),
      anAzureApiAuthorization,
      undefined as any,
      anAzureUserAttributes,
      {
        content: {
          markdown: "md",
          subject: "subject",
          third_party_data: {
            configuration_id: anOtherRCConfiguration.configuration_id,
            has_attachments: false,
          },
        },
      } as ApiNewMessageWithDefaults,
      some(anotherFiscalCode),
    );

    expect(r.kind).toBe("IResponseErrorForbiddenNotYourConfiguration");
  });

  it("should return 403 ok if a configuration_id is not provided", async () => {
    const mockGenerateObjId = vi
      .fn()
      .mockImplementationOnce(() => "mocked-message-id");

    const createMessageHandler = CreateMessageHandler(
      mockTelemetryClient,
      remoteContentClient,
      mockMessageModel,
      mockGenerateObjId,
      mockSaveBlob,
      true,
      [],
      aSandboxFiscalCode,
    );

    const r = await createMessageHandler(
      createContext(),
      anAzureApiAuthorization,
      undefined as any,
      anAzureUserAttributes,
      {
        content: {
          markdown: "md",
          subject: "subject",
          third_party_data: {
            has_attachments: false,
            has_remote_content: false,
          },
        },
      } as ApiNewMessageWithDefaults,
      some(anotherFiscalCode),
    );

    expect(r.kind).toBe("IResponseErrorForbiddenNoConfigurationId");
  });
});
