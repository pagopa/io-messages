import { NotificationHubsClient } from "@azure/notification-hubs";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { envConfig } from "../../../__mocks__/env-config.mock";
import { nhPartitionFactory } from "../../../__mocks__/notification-hub";
import {
  KindEnum,
  NotifyMessage,
} from "../../../generated/notifications/NotifyMessage";
import { toSHA256 } from "../../../utils/conversions";
import { handle } from "../handler";

const aFiscalCodeHash =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const aNotifyMessage: NotifyMessage = {
  installationId: aFiscalCodeHash,
  kind: KindEnum.Notify,
  payload: {
    message: "message",
    message_id: "id",
    title: "title",
  },
};

const mockTelemetryClient = {
  trackEvent: vi.fn(() => {}),
} as unknown as TelemetryClient;

const aNotifyMessageToBlacklistedUser: NotifyMessage = {
  ...aNotifyMessage,
  installationId: toSHA256(
    envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST[0],
  ) as NonEmptyString,
};

vi.spyOn(nhPartitionFactory, "getPartition");

describe("HandleNHNotifyMessageCallActivityQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get the right notification partition to call", async () => {
    vi.spyOn(
      NotificationHubsClient.prototype,
      "sendNotification",
    ).mockResolvedValueOnce({
      failureCount: 0,
      results: [],
      state: "Completed",
      successCount: 1,
    });

    const input = Buffer.from(
      JSON.stringify({
        message: aNotifyMessage,
        target: "current",
      }),
    ).toString("base64");

    expect.assertions(3);

    const res = await handle(
      input,
      envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST,
      mockTelemetryClient,
      nhPartitionFactory,
    );
    expect(res.kind).toEqual("SUCCESS");

    expect(nhPartitionFactory.getPartition).toHaveReturnedWith(
      expect.objectContaining({
        _client: expect.objectContaining({
          hubName: "nh4",
        }),
      }),
    );
    expect(
      NotificationHubsClient.prototype.sendNotification,
    ).toHaveBeenCalledTimes(1);
  });

  it("should call getPartition to get the legacy NH", async () => {
    vi.spyOn(
      NotificationHubsClient.prototype,
      "getInstallation",
    ).mockResolvedValueOnce({
      installationId: aFiscalCodeHash,
      platform: "apns",
      pushChannel: "channel",
    });
    vi.spyOn(
      NotificationHubsClient.prototype,
      "sendNotification",
    ).mockResolvedValueOnce({
      failureCount: 0,
      results: [],
      state: "Completed",
      successCount: 1,
    });

    const input = Buffer.from(
      JSON.stringify({
        message: aNotifyMessage,
        target: "legacy",
      }),
    ).toString("base64");

    expect.assertions(4);

    const res = await handle(
      input,
      envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST,
      mockTelemetryClient,
      nhPartitionFactory,
    );
    expect(res.kind).toEqual("SUCCESS");

    expect(
      NotificationHubsClient.prototype.sendNotification,
    ).toHaveBeenCalledTimes(1);

    expect(nhPartitionFactory.getPartition).toHaveBeenCalledWith(
      aFiscalCodeHash,
    );
    expect(nhPartitionFactory.getPartition).toHaveReturnedWith(
      expect.objectContaining({
        _client: expect.objectContaining({
          hubName: "nh4",
        }),
      }),
    );
  });

  it("should trigger a retry if notify fails", async () => {
    vi.spyOn(
      NotificationHubsClient.prototype,
      "sendNotification",
    ).mockRejectedValueOnce({});

    const input = Buffer.from(
      JSON.stringify({
        message: aNotifyMessage,
        target: "legacy",
      }),
    ).toString("base64");

    await expect(
      handle(
        input,
        envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST,
        mockTelemetryClient,
        nhPartitionFactory,
      ),
    ).rejects.toEqual(expect.objectContaining({ kind: "TRANSIENT" }));
    expect(
      NotificationHubsClient.prototype.sendNotification,
    ).toHaveBeenCalledTimes(1);
    expect(mockTelemetryClient.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({ isSuccess: "false" }),
      }),
    );
  });

  it("should not call notificationhubServicePartion.buildNHClient when using a blacklisted user", async () => {
    vi.spyOn(
      NotificationHubsClient.prototype,
      "sendNotification",
    ).mockResolvedValueOnce({
      failureCount: 0,
      results: [],
      state: "Completed",
      successCount: 1,
    });

    const input = Buffer.from(
      JSON.stringify({
        message: aNotifyMessageToBlacklistedUser,
        target: "current",
      }),
    ).toString("base64");

    expect.assertions(4);

    const res = await handle(
      input,
      envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST,
      mockTelemetryClient,
      nhPartitionFactory,
    );

    expect(res.kind).toEqual("SUCCESS");
    expect(res).toHaveProperty("skipped", true);

    expect(NotificationHubsClient.prototype.sendNotification).not.toBeCalled();
    expect(nhPartitionFactory.getPartition).not.toHaveBeenCalled();
  });
});
