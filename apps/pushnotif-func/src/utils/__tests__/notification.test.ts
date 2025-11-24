import {
  NotificationHubsClient,
  NotificationHubsMessageResponse,
  NotificationHubsResponse,
  createTemplateNotification,
} from "@azure/notification-hubs";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import * as E from "fp-ts/Either";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { nhPartitionFactory } from "../../__mocks__/notification-hub";
import {
  KindEnum,
  NotifyMessage,
} from "../../generated/notifications/NotifyMessage";
import {
  createOrUpdateInstallation,
  deleteInstallation,
  notify,
  toTagExpression,
} from "../notification";

const aFiscalCodeHash =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const anInstallationId = aFiscalCodeHash;

const mockTelemetryClient = {
  trackEvent: vi.fn(() => {}),
  trackException: vi.fn(() => {}),
} as unknown as TelemetryClient;

const aNotificationHubsResponse: NotificationHubsResponse = {
  correlationId: "correlation-123",
  location: "west-europe",
  trackingId: "tracking-123",
};

describe("notify", () => {
  let notificationHubsClient: NotificationHubsClient;

  const aSendNotificationResponse: NotificationHubsMessageResponse = {
    failureCount: 0,
    results: [],
    state: "Enqueued",
    successCount: 0,
  };

  const aNotifyMessage: NotifyMessage = {
    installationId: anInstallationId,
    kind: KindEnum.Notify,
    payload: {
      message: "message",
      message_id: "id",
      title: "title",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    notificationHubsClient = nhPartitionFactory.getPartition(anInstallationId);
    vi.spyOn(notificationHubsClient, "sendNotification").mockResolvedValue(
      aSendNotificationResponse,
    );
  });

  it("should succesfully send a notification", async () => {
    const res = await notify(
      notificationHubsClient,
      aNotifyMessage.payload,
      anInstallationId,
      mockTelemetryClient,
    )();

    expect(notificationHubsClient.sendNotification).toHaveBeenCalledTimes(1);
    expect(notificationHubsClient.sendNotification).toHaveBeenCalledWith(
      createTemplateNotification({
        body: {
          message: "message",
          message_id: "id",
          title: "title",
        },
      }),
      {
        tagExpression: toTagExpression(anInstallationId),
      },
    );

    expect(E.isRight(res)).toBe(true);
  });

  it("should throw an error", async () => {
    vi.spyOn(notificationHubsClient, "sendNotification").mockRejectedValueOnce(
      new Error(),
    );

    const res = await notify(
      notificationHubsClient,
      aNotifyMessage.payload,
      anInstallationId,
      mockTelemetryClient,
    )();

    expect(notificationHubsClient.sendNotification).toHaveBeenCalledTimes(1);

    expect(E.isLeft(res)).toBe(true);
    if (E.isLeft(res)) {
      expect(res.left.message).toContain(
        "Error while sending notification to NotificationHub",
      );
    }
  });
});

describe("createOrUpdateInstallation", () => {
  let primaryNh: NotificationHubsClient;

  beforeEach(() => {
    vi.clearAllMocks();
    primaryNh = nhPartitionFactory.getPartition(aFiscalCodeHash);
    vi.spyOn(primaryNh, "createOrUpdateInstallation").mockResolvedValue(
      aNotificationHubsResponse,
    );
  });

  it("should succesfully create or update", async () => {
    const res = await createOrUpdateInstallation(
      primaryNh,
      anInstallationId,
      "apns",
      "push-channel",
      ["tag1", "tag2"],
    )();

    expect(primaryNh.createOrUpdateInstallation).toHaveBeenCalledTimes(1);

    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      const legacyResp = res.right;
      expect(legacyResp).toEqual(aNotificationHubsResponse);
    }
  });

  it("should fail to create or update, throw an error", async () => {
    vi.spyOn(primaryNh, "createOrUpdateInstallation").mockRejectedValueOnce(
      new Error(),
    );

    const res = await createOrUpdateInstallation(
      primaryNh,
      anInstallationId,
      "apns",
      "push-channel",
      [],
    )();

    expect(E.isLeft(res)).toBe(true);
    if (E.isLeft(res)) {
      expect(res.left.message).toContain(
        "Error while creating or updating installation",
      );
    }

    expect(primaryNh.createOrUpdateInstallation).toHaveBeenCalledTimes(1);
  });
});

describe("deleteInstallation", () => {
  let primaryNh: NotificationHubsClient;

  beforeEach(() => {
    vi.clearAllMocks();
    primaryNh = nhPartitionFactory.getPartition(anInstallationId);
    vi.spyOn(primaryNh, "deleteInstallation").mockResolvedValue(
      aNotificationHubsResponse,
    );
  });

  it("should succesfully delete", async () => {
    const res = await deleteInstallation(primaryNh, anInstallationId)();

    expect(primaryNh.deleteInstallation).toHaveBeenCalledTimes(1);
    expect(primaryNh.deleteInstallation).toHaveBeenCalledWith(anInstallationId);

    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      const legacyResp = res.right;
      expect(legacyResp).toEqual(aNotificationHubsResponse);
    }
  });

  it("should fail to delete, throw an error", async () => {
    vi.spyOn(primaryNh, "deleteInstallation").mockRejectedValueOnce(
      new Error(),
    );

    const res = await deleteInstallation(primaryNh, anInstallationId)();

    expect(E.isLeft(res)).toBe(true);
    if (E.isLeft(res)) {
      expect(res.left.message).toContain(
        "Error while deleting installation on Legacy",
      );
    }

    expect(primaryNh.deleteInstallation).toHaveBeenCalledTimes(1);
  });
});
