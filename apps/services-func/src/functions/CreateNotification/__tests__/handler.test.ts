import { FunctionOutput, InvocationContext } from "@azure/functions";
import { HttpsUrl } from "@pagopa/io-functions-commons/dist/generated/definitions/HttpsUrl";
import { NotificationModel } from "@pagopa/io-functions-commons/dist/src/models/notification";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { describe, expect, it, vi } from "vitest";

import {
  aCreatedMessageEventSenderMetadata,
  aMessageContent,
  aNewMessageWithoutContent,
  aRetrievedProfile,
} from "../../../__mocks__/mocks";
import { NotificationCreatedEvent } from "../../../utils/events/message";
import { getCreateNotificationHandler } from "../handler";

const mockNotificationCreate = vi
  .fn()
  .mockImplementation(() => TE.of({ id: "any-notification-id" }));

const mockNotificaionModel = {
  create: mockNotificationCreate,
} as unknown as NotificationModel;

function fail(message: string) {
  throw new Error(message);
}

const aDefaultWebhookUrl = pipe(
  HttpsUrl.decode("https://example.com"),
  E.getOrElseW((err) => {
    throw fail(`Cannot decode url: ${readableReport(err)}`);
  }),
);

const aSandboxFiscalCode = "AAAAAA00A00A000A" as FiscalCode;

const mockEmailOutput = {} as FunctionOutput;
const mockWebhookOutput = {} as FunctionOutput;

const createContext = () =>
  ({
    debug: vi.fn(),
    error: vi.fn(),
    extraOutputs: { set: vi.fn() },
    functionName: "funcname",
    log: vi.fn(),
    warn: vi.fn(),
  }) as unknown as InvocationContext;

const aProfileWithWebhookEnabled = {
  ...aRetrievedProfile,
  isWebhookEnabled: true,
};

const aProfileWithEmailEnabled = {
  ...aRetrievedProfile,
  email: "email@example.com",
  isEmailEnabled: true,
  isEmailValidated: true,
  isInboxEnabled: true,
};

const mockRetrieveProcessingMessageData = vi.fn().mockImplementation(() =>
  TE.of(
    O.some({
      content: aMessageContent,
      message: aNewMessageWithoutContent,
      senderMetadata: aCreatedMessageEventSenderMetadata,
    }),
  ),
);

describe("getCreateNotificationHandler", () => {
  it("should send email notification to user who enabled email", async () => {
    const handler = getCreateNotificationHandler(
      mockNotificaionModel,
      aDefaultWebhookUrl,
      aSandboxFiscalCode,
      [],
      mockRetrieveProcessingMessageData,
      mockEmailOutput,
      mockWebhookOutput,
    );

    const context = createContext();
    await handler(
      context,
      JSON.stringify({
        blockedInboxOrChannels: [],
        messageId: aNewMessageWithoutContent.id,
        profile: aProfileWithEmailEnabled,
      }),
    );

    const emailOutputValue = (
      context.extraOutputs.set as ReturnType<typeof vi.fn>
    ).mock.calls.find(([output]) => output === mockEmailOutput)?.[1];

    expect(emailOutputValue).toBeDefined();

    expect(
      pipe(emailOutputValue, NotificationCreatedEvent.decode, E.isRight),
    ).toBe(true);
  });

  it("should send webhook notification to user who enabled webhook", async () => {
    const handler = getCreateNotificationHandler(
      mockNotificaionModel,
      aDefaultWebhookUrl,
      aSandboxFiscalCode,
      [],
      mockRetrieveProcessingMessageData,
      mockEmailOutput,
      mockWebhookOutput,
    );

    const context = createContext();
    await handler(
      context,
      JSON.stringify({
        blockedInboxOrChannels: [],
        messageId: aNewMessageWithoutContent.id,
        profile: aProfileWithWebhookEnabled,
      }),
    );

    const webhookOutputValue = (
      context.extraOutputs.set as ReturnType<typeof vi.fn>
    ).mock.calls.find(([output]) => output === mockWebhookOutput)?.[1];

    expect(webhookOutputValue).toBeDefined();

    expect(
      pipe(webhookOutputValue, NotificationCreatedEvent.decode, E.isRight),
    ).toBe(true);
  });
});
