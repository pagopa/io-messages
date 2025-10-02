import { beforeEach, describe, expect, it, vi } from "vitest";
import * as E from "fp-ts/Either";
import {
  createTemplateNotification,
  NotificationHubsClient,
  NotificationHubsMessageResponse,
  NotificationHubsResponse,
} from "@azure/notification-hubs";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import {
  createOrUpdateInstallation,
  deleteInstallation,
  notify,
  toTagExpression,
} from "../notification";
import {
  nhPartitionFactory,
  legacyNhPartitionFactory,
} from "../../__mocks__/notification-hub";
import {
  NotifyMessage,
  KindEnum,
} from "../../generated/notifications/NotifyMessage";
import { TelemetryClient } from "applicationinsights";

const aFiscalCodeHash =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const anInstallationId = aFiscalCodeHash;

const aNotificationHubsResponse: NotificationHubsResponse = {
  trackingId: "tracking-123",
  correlationId: "correlation-123",
  location: "west-europe",
};

describe("notify", () => {
  let notificationHubsClient: NotificationHubsClient;

  const mockTelemetryClient = {
    trackEvent: vi.fn(() => {}),
  } as unknown as TelemetryClient;

  const aSendNotificationResponse: NotificationHubsMessageResponse = {
    successCount: 0,
    failureCount: 0,
    results: [],
    state: "Enqueued",
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
    (notificationHubsClient.sendNotification as any).mockRejectedValueOnce(
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

  it("should succesfully create or update on legacy and primary, return two success responses", async () => {
    const res = await createOrUpdateInstallation(
      primary,
      legacy,
      anInstallationId,
      "apns",
      "push-channel",
      ["tag1", "tag2"],
    )();

    expect(legacy.createOrUpdateInstallation).toHaveBeenCalledTimes(1);
    expect(primary.createOrUpdateInstallation).toHaveBeenCalledTimes(1);

    const legacyArgs = (legacy.createOrUpdateInstallation as any).mock
      .calls[0][0];
    expect(legacyArgs.installationId).toBe(anInstallationId);
    expect(legacyArgs.platform).toBe("apns");
    expect(legacyArgs.pushChannel).toBe("push-channel");
    expect(legacyArgs.templates.template.tags).toEqual(["tag1", "tag2"]);

    const primaryArgs = (primary.createOrUpdateInstallation as any).mock
      .calls[0][0];
    expect(primaryArgs.installationId).toBe(anInstallationId);
    expect(primaryArgs.platform).toBe("apns");

    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right).toHaveLength(2);
      const [legacyResp, primaryResp] = res.right;
      expect(legacyResp).toEqual(aNotificationHubsResponse);
      expect(primaryResp).toEqual(aNotificationHubsResponse);
    }
  });

  it("should succesfully create or update on legacy and fail primary, return one success response and one error", async () => {
    (primary.createOrUpdateInstallation as any).mockRejectedValueOnce(
      new Error(),
    );

    const res = await createOrUpdateInstallation(
      primary,
      legacy,
      anInstallationId,
      "apns",
      "push-channel",
      ["tag1", "tag2"],
    )();

    expect(legacy.createOrUpdateInstallation).toHaveBeenCalledTimes(1);
    expect(primary.createOrUpdateInstallation).toHaveBeenCalledTimes(1);

    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right).toHaveLength(2);
      const [legacyResp, maybeErr] = res.right;
      expect(legacyResp).toEqual(aNotificationHubsResponse);
      expect(maybeErr).toBeInstanceOf(Error);
      expect((maybeErr as Error).message).toContain(
        "Error while creating or updating installation",
      );
    }
  });

  it("should fail to create or update on legacy and skip primary, throw one error", async () => {
    (legacy.createOrUpdateInstallation as any).mockRejectedValueOnce(
      new Error(),
    );

    const res = await createOrUpdateInstallation(
      primary,
      legacy,
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

  it("should succesfully delete on legacy and primary, return two success responses", async () => {
    const res = await deleteInstallation(primary, legacy, anInstallationId)();

    expect(legacy.deleteInstallation).toHaveBeenCalledTimes(1);
    expect(legacy.deleteInstallation).toHaveBeenCalledWith(anInstallationId);
    expect(primary.deleteInstallation).toHaveBeenCalledTimes(1);
    expect(primary.deleteInstallation).toHaveBeenCalledWith(anInstallationId);

    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right).toHaveLength(2);
    }
  });

  it("should succesfully delete on legacy and fail primary, return one success responses and one error", async () => {
    (primary.deleteInstallation as any).mockRejectedValueOnce(new Error());

    const res = await deleteInstallation(primary, legacy, anInstallationId)();

    expect(legacy.deleteInstallation).toHaveBeenCalledTimes(1);
    expect(legacy.deleteInstallation).toHaveBeenCalledWith(anInstallationId);

    expect(primary.deleteInstallation).toHaveBeenCalledTimes(1);
    expect(primary.deleteInstallation).toHaveBeenCalledWith(anInstallationId);

    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right).toHaveLength(2);
      const [legacyResp, maybeErr] = res.right;
      expect(legacyResp).toEqual(aNotificationHubsResponse);
      expect(maybeErr).toBeInstanceOf(Error);
      expect((maybeErr as Error).message).toContain(
        "Error while deleting installation",
      );
    }
  });

  it("should fail to delete on legacy and skip primary, throw one error", async () => {
    (legacy.deleteInstallation as any).mockRejectedValueOnce(new Error());

    const res = await deleteInstallation(primary, legacy, anInstallationId)();

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
