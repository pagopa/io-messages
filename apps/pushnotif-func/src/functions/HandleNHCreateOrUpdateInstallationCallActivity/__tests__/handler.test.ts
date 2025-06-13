import { NotificationHubsClient } from "@azure/notification-hubs";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { context as contextMock } from "../../../__mocks__/durable-functions";
import { nhPartitionFactory } from "../../../__mocks__/notification-hub";
import {
  CreateOrUpdateInstallationMessage,
  KindEnum,
} from "../../../generated/notifications/CreateOrUpdateInstallationMessage";
import { PlatformEnum } from "../../../generated/notifications/Platform";
import { createActivity } from "../../../utils/durable/activities";
import {
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody,
} from "../handler";

const activityName = "any";

const aFiscalCodeHash =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;
const aPushChannel =
  "fLKP3EATnBI:APA91bEy4go681jeSEpLkNqhtIrdPnEKu6Dfi-STtUiEnQn8RwMfBiPGYaqdWrmzJyXIh5Yms4017MYRS9O1LGPZwA4sOLCNIoKl4Fwg7cSeOkliAAtlQ0rVg71Kr5QmQiLlDJyxcq3p";

const aCreateOrUpdateInstallationMessage: CreateOrUpdateInstallationMessage = {
  installationId: aFiscalCodeHash,
  kind: KindEnum.CreateOrUpdateInstallation,
  platform: PlatformEnum.apns,
  pushChannel: aPushChannel,
  tags: [aFiscalCodeHash],
};

vi.spyOn(nhPartitionFactory, "getPartition");

const mockTelemetryClient = {
  trackEvent: vi.fn(() => {}),
} as unknown as TelemetryClient;

const handler = createActivity(
  activityName,
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody(nhPartitionFactory, mockTelemetryClient),
);

describe("HandleNHCreateOrUpdateInstallationCallActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call a createOrUpdateInstallation using the right notification hub partition ending with a success", async () => {
    vi.spyOn(
      NotificationHubsClient.prototype,
      "createOrUpdateInstallation",
    ).mockResolvedValueOnce({});

    const input = ActivityInput.encode({
      installationId: aCreateOrUpdateInstallationMessage.installationId,
      platform: aCreateOrUpdateInstallationMessage.platform,
      pushChannel: aCreateOrUpdateInstallationMessage.pushChannel,
      tags: aCreateOrUpdateInstallationMessage.tags,
    });

    expect.assertions(2);

    const res = await handler(contextMock, input);
    expect(ActivityResultSuccess.is(res)).toBeTruthy();
    expect(nhPartitionFactory.getPartition).toHaveReturnedWith(
      expect.objectContaining({
        _client: expect.objectContaining({
          hubName: "nh4",
        }),
      }),
    );
  });

  it("should trigger a retry if CreateOrUpdateInstallation fails", async () => {
    vi.spyOn(
      NotificationHubsClient.prototype,
      "createOrUpdateInstallation",
    ).mockRejectedValueOnce({});

    const input = ActivityInput.encode({
      installationId: aCreateOrUpdateInstallationMessage.installationId,
      platform: aCreateOrUpdateInstallationMessage.platform,
      pushChannel: aCreateOrUpdateInstallationMessage.pushChannel,
      tags: aCreateOrUpdateInstallationMessage.tags,
    });

    expect.assertions(2);

    try {
      await handler(contextMock, input);
    } catch (e) {
      expect(
        NotificationHubsClient.prototype.createOrUpdateInstallation,
      ).toHaveBeenCalledTimes(1);
      expect(e).toBeInstanceOf(Error);
    }
  });
});
