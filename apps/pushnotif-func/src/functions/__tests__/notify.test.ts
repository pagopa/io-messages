/* eslint-disable vitest/prefer-called-with, no-useless-escape */

import { PushNotificationsContentTypeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/PushNotificationsContentType";
import { ReminderStatusEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ReminderStatus";
import { UserGroup } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_api_auth";
import context_middleware from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { ResponseErrorInternal } from "@pagopa/ts-commons/lib/responses";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockContext,
  createMockRequest,
} from "../../__mocks__/httptrigger.mock";
import {
  aFiscalCode,
  aRetrievedMessageWithContent,
  aRetrievedProfile,
  aRetrievedService,
} from "../../__mocks__/models.mock";
import { NotificationInfo } from "../../generated/definitions/NotificationInfo";
import { NotificationTypeEnum } from "../../generated/definitions/NotificationType";
import { toHash } from "../../utils/crypto";
import { Notify, NotifyHandler } from "../notify";
import { SendNotification } from "../../utils/notify/notification";
import {
  MessageWithContentReader,
  ServiceReader,
  SessionStatusReader,
  UserProfileReader,
} from "../../utils/notify/readers";

const aValidMessageNotifyPayload: NotificationInfo = {
  fiscal_code: aFiscalCode,
  message_id: "aMessageId" as NonEmptyString,
  notification_type: NotificationTypeEnum.MESSAGE,
};

const aValidReadReminderNotifyPayload: NotificationInfo = {
  fiscal_code: aFiscalCode,
  message_id: "aMessageId" as NonEmptyString,
  notification_type: NotificationTypeEnum.REMINDER_READ,
};

// -------------------------------------
// Mocks
// -------------------------------------

const userSessionReaderMock = vi.fn(
  () => TE.of({ active: true }) as ReturnType<SessionStatusReader>,
);

const messageReaderMock = vi.fn(
  (_, messageId) =>
    TE.of({
      ...aRetrievedMessageWithContent,
      id: messageId,
    }) as ReturnType<MessageWithContentReader>,
);

const serviceReaderMock = vi.fn(
  () => TE.of(aRetrievedService) as ReturnType<ServiceReader>,
);

const userProfileReaderMock = vi.fn(
  () =>
    TE.of({
      ...aRetrievedProfile,
      reminderStatus: ReminderStatusEnum.ENABLED,
    }) as ReturnType<UserProfileReader>,
);

const sendNotificationMock = vi.fn(
  () => TE.of(void 0) as ReturnType<SendNotification>,
);

const mockContext = createMockContext();
const mockContextMiddleware = vi.fn(async () => E.of(mockContext));

vi.spyOn(context_middleware, "ContextMiddleware").mockReturnValue(
  mockContextMiddleware,
);

const logger = {
  error: vi.fn(),
  info: vi.fn(),
  trackEvent: vi.fn(() => void 0),
  warning: vi.fn(),
};

const getHandler = () =>
  NotifyHandler(
    userProfileReaderMock,
    userSessionReaderMock,
    messageReaderMock,
    serviceReaderMock,
    sendNotificationMock,
  );

// -------------------------------------
// Tests
// -------------------------------------
describe("Notify Middlewares", () => {
  it("should return 400 if payload is not defined", async () => {
    const aRequestWithInvalidPayload = createMockRequest({
      body: { string: JSON.stringify({}) },
    });

    const notifyhandler = Notify(
      userProfileReaderMock,
      userSessionReaderMock,
      messageReaderMock,
      serviceReaderMock,
      sendNotificationMock,
      {} as TelemetryClient,
    );

    const res = await notifyhandler(aRequestWithInvalidPayload, mockContext);

    expect(res.status).toEqual(400);
    expect(res.jsonBody).toEqual(
      expect.objectContaining({
        detail: `value [undefined] at [root.0.notification_type] is not a valid [NotificationType]\nvalue [undefined] at [root.0.fiscal_code] is not a valid [string that matches the pattern \"^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$\"]\nvalue [undefined] at [root.0.message_id] is not a valid [non empty string]`,
        status: 400,
        title: "Invalid NotificationInfo",
      }),
    );
  });

  it("should return 400 if payload is not correct", async () => {
    const aRequestWithInvalidPayload = createMockRequest({
      body: {
        string: JSON.stringify({
          ...aValidMessageNotifyPayload,
          message_id: "",
        }),
      },
    });

    const notifyhandler = Notify(
      userProfileReaderMock,
      userSessionReaderMock,
      messageReaderMock,
      serviceReaderMock,
      sendNotificationMock,
      {} as TelemetryClient,
    );

    const res = await notifyhandler(aRequestWithInvalidPayload, mockContext);

    expect(res.status).toEqual(400);
    expect(res.jsonBody).toEqual(
      expect.objectContaining({
        detail: `value [\"\"] at [root.0.message_id] is not a valid [non empty string]`,
        status: 400,
        title: "Invalid NotificationInfo",
      }),
    );
  });

  it.each([
    {
      notification_type: NotificationTypeEnum.MESSAGE,
      x_user_groups: UserGroup.ApiMessageRead,
    },
    {
      notification_type: NotificationTypeEnum.REMINDER_PAYMENT,
      x_user_groups: UserGroup.ApiMessageRead,
    },
    {
      notification_type: NotificationTypeEnum.REMINDER_PAYMENT_LAST,
      x_user_groups: UserGroup.ApiMessageRead,
    },
    {
      notification_type: NotificationTypeEnum.REMINDER_READ,
      x_user_groups: UserGroup.ApiMessageRead,
    },
  ])(
    "should return 403 if user groups are not corrects",
    async ({ notification_type, x_user_groups }) => {
      const aRequestWithNotAllowedPayload = createMockRequest({
        body: {
          string: JSON.stringify({
            ...aValidMessageNotifyPayload,
            notification_type: notification_type,
          }),
        },
        headers: {
          "x-user-groups": x_user_groups,
        } as Record<string, string>,
      });

      const notifyhandler = Notify(
        userProfileReaderMock,
        userSessionReaderMock,
        messageReaderMock,
        serviceReaderMock,
        sendNotificationMock,
        {} as TelemetryClient,
      );

      const res = await notifyhandler(
        aRequestWithNotAllowedPayload,
        mockContext,
      );

      expect(res.status).toEqual(403);
      expect(res.jsonBody).toEqual(
        expect.objectContaining({
          detail: `No valid scopes, you are not allowed to send such payloads. Ask the administrator to give you the required permissions.`,
          status: 403,
          title: "You are not allowed here",
        }),
      );
    },
  );
});

/* eslint-disable max-lines-per-function */
describe("Notify |> Reminder |> Success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return Success if a Read Reminder is sent to allowed fiscal code with verbose notification", async () => {
    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });
    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Leggi il messaggio da ${aRetrievedService.organizationName}`,
      aRetrievedMessageWithContent.content.subject,
    );
    expect(logger.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "send-notification.info",
        properties: {
          hashedFiscalCode: toHash(
            aValidReadReminderNotifyPayload.fiscal_code,
          ) as NonEmptyString,
          messageId: aValidReadReminderNotifyPayload.message_id,
          notificationType: aValidReadReminderNotifyPayload.notification_type,
          userSessionRetrieved: true,
          verbose: true,
        },
      }),
    );
  });

  it("should return Success if a Read Reminder is sent to allowed fiscal code with silent notification", async () => {
    userSessionReaderMock.mockImplementationOnce(() =>
      TE.of({ active: false }),
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });
    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Hai un messaggio non letto`,
      `Entra nell'app per leggerlo`,
    );
    expect(logger.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "send-notification.info",
        properties: {
          hashedFiscalCode: toHash(
            aValidReadReminderNotifyPayload.fiscal_code,
          ) as NonEmptyString,
          messageId: aValidReadReminderNotifyPayload.message_id,
          notificationType: aValidReadReminderNotifyPayload.notification_type,
          userSessionRetrieved: true,
          verbose: false,
        },
      }),
    );
  });

  it("should return Success if a Read Reminder is sent to allowed fiscal code with silent notification when service is privacy critical", async () => {
    serviceReaderMock.mockImplementationOnce(() =>
      TE.of({ ...aRetrievedService, requireSecureChannels: true }),
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });
    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Hai un messaggio non letto`,
      `Entra nell'app per leggerlo`,
    );
    expect(logger.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "send-notification.info",
        properties: {
          hashedFiscalCode: toHash(
            aValidReadReminderNotifyPayload.fiscal_code,
          ) as NonEmptyString,
          messageId: aValidReadReminderNotifyPayload.message_id,
          notificationType: aValidReadReminderNotifyPayload.notification_type,
          userSessionRetrieved: true,
          verbose: false,
        },
      }),
    );
  });

  it("should return Success if a Payment Reminder is sent to allowed fiscal code with verbose notification", async () => {
    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, {
      ...aValidReadReminderNotifyPayload,
      notification_type: NotificationTypeEnum.REMINDER_PAYMENT,
    });

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });

    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Hai un avviso da pagare`,
      `Entra nell’app e paga l’avviso emesso da ${aRetrievedService.organizationName}`,
    );
    expect(logger.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "send-notification.info",
        properties: {
          hashedFiscalCode: toHash(
            aValidReadReminderNotifyPayload.fiscal_code,
          ) as NonEmptyString,
          messageId: aValidReadReminderNotifyPayload.message_id,
          notificationType: NotificationTypeEnum.REMINDER_PAYMENT,
          userSessionRetrieved: true,
          verbose: true,
        },
      }),
    );
  });

  it("should return Success if user session cannot be retrieved, sending a silent notification", async () => {
    userSessionReaderMock.mockImplementationOnce(() =>
      TE.left(ResponseErrorInternal("an Error")),
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });

    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Hai un messaggio non letto`,
      `Entra nell'app per leggerlo`,
    );
    expect(logger.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "send-notification.info",
        properties: {
          hashedFiscalCode: toHash(
            aValidReadReminderNotifyPayload.fiscal_code,
          ) as NonEmptyString,
          messageId: aValidReadReminderNotifyPayload.message_id,
          notificationType: aValidReadReminderNotifyPayload.notification_type,
          userSessionRetrieved: false,
          verbose: false,
        },
      }),
    );
  });

  it("should return Success if user did not choose push notification verbosity level, sending a silent notification", async () => {
    userProfileReaderMock.mockImplementationOnce(() => {
      const oldProfile = aRetrievedProfile;
      delete oldProfile.pushNotificationsContentType;
      return TE.of({
        ...oldProfile,
        reminderStatus: ReminderStatusEnum.ENABLED,
      });
    });

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });

    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Hai un messaggio non letto`,
      `Entra nell'app per leggerlo`,
    );
    expect(logger.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "send-notification.info",
        properties: {
          hashedFiscalCode: toHash(
            aValidReadReminderNotifyPayload.fiscal_code,
          ) as NonEmptyString,
          messageId: aValidReadReminderNotifyPayload.message_id,
          notificationType: aValidReadReminderNotifyPayload.notification_type,
          userSessionRetrieved: true,
          verbose: false,
        },
      }),
    );
  });

  it("should return Success if user choosed to receve anonymous push notification, sending a silent notification", async () => {
    userProfileReaderMock.mockImplementationOnce(() =>
      TE.of({
        ...aRetrievedProfile,
        pushNotificationsContentType:
          PushNotificationsContentTypeEnum.ANONYMOUS,
        reminderStatus: ReminderStatusEnum.ENABLED,
      }),
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });

    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Hai un messaggio non letto`,
      `Entra nell'app per leggerlo`,
    );
    expect(logger.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "send-notification.info",
        properties: {
          hashedFiscalCode: toHash(
            aValidReadReminderNotifyPayload.fiscal_code,
          ) as NonEmptyString,
          messageId: aValidReadReminderNotifyPayload.message_id,
          notificationType: aValidReadReminderNotifyPayload.notification_type,
          userSessionRetrieved: true,
          verbose: false,
        },
      }),
    );
  });

  it.each([
    {
      notification_type: NotificationTypeEnum.REMINDER_PAYMENT,
      x_user_groups: UserGroup.ApiReminderNotify,
    },
    {
      notification_type: NotificationTypeEnum.REMINDER_PAYMENT_LAST,
      x_user_groups: UserGroup.ApiReminderNotify,
    },
    {
      notification_type: NotificationTypeEnum.REMINDER_READ,
      x_user_groups: UserGroup.ApiReminderNotify,
    },
  ])(
    "should return 204 with the correct user groups",
    async ({ notification_type, x_user_groups }) => {
      const aRequestWithAllowedPayload = createMockRequest({
        body: {
          string: JSON.stringify({
            ...aValidMessageNotifyPayload,
            notification_type,
          }),
        },
        headers: {
          "x-user-groups": x_user_groups,
        } as Record<string, string>,
      });

      const notifyhandler = Notify(
        userProfileReaderMock,
        userSessionReaderMock,
        messageReaderMock,
        serviceReaderMock,
        sendNotificationMock,
        {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          trackEvent: (_) => void 0,
        } as TelemetryClient,
      );

      const res = await notifyhandler(aRequestWithAllowedPayload, mockContext);

      expect(res.status).toEqual(204);
    },
  );
});
/* eslint-enable max-lines-per-function */

describe("Notify |> Reminder |> Errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return success no content if a MESSAGE notification type is sent", async () => {
    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidMessageNotifyPayload);

    expect(res).toMatchObject({
      kind: "IResponseSuccessNoContent",
    });
    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      "aMessageId",
      "Hai un nuovo messaggio",
      "Entra nell'app per leggerlo",
    );
  });

  it("should return NotAuthorized if user has not enabled reminder notification", async () => {
    userProfileReaderMock.mockImplementationOnce(() =>
      TE.of(aRetrievedProfile),
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({
      detail:
        "You are not allowed here: You're not allowed to send the notification",
      kind: "IResponseErrorForbiddenNotAuthorized",
    });
    expect(userProfileReaderMock).toHaveBeenCalled();
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("should return InternalError if user's profile cannot be retrieved", async () => {
    userProfileReaderMock.mockImplementationOnce(() =>
      TE.left(ResponseErrorInternal("an Error")),
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({
      detail: "Internal server error: Error checking user preferences",
      kind: "IResponseErrorInternal",
    });
    expect(userProfileReaderMock).toHaveBeenCalled();
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("should return InternalError if message cannot be retrieved", async () => {
    messageReaderMock.mockImplementationOnce(() =>
      TE.left(ResponseErrorInternal("an Error")),
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({
      detail: "Internal server error: an Error",
      kind: "IResponseErrorInternal",
    });
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("should return InternalError if service cannot be retrieved", async () => {
    serviceReaderMock.mockImplementationOnce(() =>
      TE.left(ResponseErrorInternal("an Error")),
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({
      detail: "Internal server error: an Error",
      kind: "IResponseErrorInternal",
    });
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("should return InternalError if sendNotification fails", async () => {
    sendNotificationMock.mockImplementationOnce(() =>
      TE.left(Error("a Queue Error")),
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({
      detail:
        "Internal server error: Error while sending notification to queue",
      kind: "IResponseErrorInternal",
    });
  });
});
