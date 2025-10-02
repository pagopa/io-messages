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

import {
  legacyNhPartitionFactory,
  nhPartitionFactory,
} from "../../__mocks__/notification-hub";
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
  let primary: NotificationHubsClient;
  let legacy: NotificationHubsClient;

  beforeEach(() => {
    vi.clearAllMocks();
    primary = nhPartitionFactory.getPartition(aFiscalCodeHash);
    legacy = legacyNhPartitionFactory.getPartition(aFiscalCodeHash);
    vi.spyOn(legacy, "createOrUpdateInstallation").mockResolvedValue(
      aNotificationHubsResponse,
    );
    vi.spyOn(primary, "createOrUpdateInstallation").mockResolvedValue(
      aNotificationHubsResponse,
    );
  });

  it("should succesfully create or update on legacy and primary, returns legacy response", async () => {
    const res = await createOrUpdateInstallation(
      primary,
      legacy,
      anInstallationId,
      "apns",
      "push-channel",
      ["tag1", "tag2"],
      mockTelemetryClient,
    )();

    expect(legacy.createOrUpdateInstallation).toHaveBeenCalledTimes(1);
    expect(primary.createOrUpdateInstallation).toHaveBeenCalledTimes(1);

    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      const legacyResp = res.right;
      expect(legacyResp).toEqual(aNotificationHubsResponse);
    }
  });

  it("should succesfully create or update on legacy and fail primary, returns legacy response", async () => {
    vi.spyOn(primary, "createOrUpdateInstallation").mockRejectedValueOnce(
      new Error(),
    );

    const res = await createOrUpdateInstallation(
      primary,
      legacy,
      anInstallationId,
      "apns",
      "push-channel",
      ["tag1", "tag2"],
      mockTelemetryClient,
    )();

    expect(legacy.createOrUpdateInstallation).toHaveBeenCalledTimes(1);
    expect(primary.createOrUpdateInstallation).toHaveBeenCalledTimes(1);

    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      const legacyResp = res.right;
      expect(legacyResp).toEqual(aNotificationHubsResponse);
    }
  });

  it("should fail to create or update on legacy and skip primary, throw an error", async () => {
    vi.spyOn(legacy, "createOrUpdateInstallation").mockRejectedValueOnce(
      new Error(),
    );

    const res = await createOrUpdateInstallation(
      primary,
      legacy,
      anInstallationId,
      "apns",
      "push-channel",
      [],
      mockTelemetryClient,
    )();

    expect(E.isLeft(res)).toBe(true);
    if (E.isLeft(res)) {
      expect(res.left.message).toContain(
        "Error while creating or updating installation",
      );
    }

    expect(legacy.createOrUpdateInstallation).toHaveBeenCalledTimes(1);
    expect(primary.createOrUpdateInstallation).not.toHaveBeenCalled();
  });
});

describe("deleteInstallation", () => {
  let primary: NotificationHubsClient;
  let legacy: NotificationHubsClient;

  beforeEach(() => {
    vi.clearAllMocks();
    primary = nhPartitionFactory.getPartition(anInstallationId);
    legacy = legacyNhPartitionFactory.getPartition(anInstallationId);
    vi.spyOn(legacy, "deleteInstallation").mockResolvedValue(
      aNotificationHubsResponse,
    );
    vi.spyOn(primary, "deleteInstallation").mockResolvedValue(
      aNotificationHubsResponse,
    );
  });

  it("should succesfully delete on legacy and primary, returns legacy response", async () => {
    const res = await deleteInstallation(
      primary,
      legacy,
      anInstallationId,
      mockTelemetryClient,
    )();

    expect(legacy.deleteInstallation).toHaveBeenCalledTimes(1);
    expect(legacy.deleteInstallation).toHaveBeenCalledWith(anInstallationId);
    expect(primary.deleteInstallation).toHaveBeenCalledTimes(1);
    expect(primary.deleteInstallation).toHaveBeenCalledWith(anInstallationId);

    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      const legacyResp = res.right;
      expect(legacyResp).toEqual(aNotificationHubsResponse);
    }
  });

  it("should succesfully delete on legacy and fail primary, returns legacy response", async () => {
    vi.spyOn(primary, "deleteInstallation").mockRejectedValueOnce(new Error());

    const res = await deleteInstallation(
      primary,
      legacy,
      anInstallationId,
      mockTelemetryClient,
    )();

    expect(legacy.deleteInstallation).toHaveBeenCalledTimes(1);
    expect(legacy.deleteInstallation).toHaveBeenCalledWith(anInstallationId);

    expect(primary.deleteInstallation).toHaveBeenCalledTimes(1);
    expect(primary.deleteInstallation).toHaveBeenCalledWith(anInstallationId);

    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      const legacyResp = res.right;
      expect(legacyResp).toEqual(aNotificationHubsResponse);
    }
  });

  it("should fail to delete on legacy and skip primary, throw an error", async () => {
    vi.spyOn(legacy, "deleteInstallation").mockRejectedValueOnce(new Error());

    const res = await deleteInstallation(
      primary,
      legacy,
      anInstallationId,
      mockTelemetryClient,
    )();

    expect(E.isLeft(res)).toBe(true);
    if (E.isLeft(res)) {
      expect(res.left.message).toContain(
        "Error while deleting installation on Legacy",
      );
    }

    expect(legacy.deleteInstallation).toHaveBeenCalledTimes(1);
    expect(primary.deleteInstallation).not.toHaveBeenCalled();
  });
});
