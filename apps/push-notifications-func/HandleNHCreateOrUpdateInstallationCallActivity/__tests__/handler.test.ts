import { NotificationHubsClient } from "@azure/notification-hubs";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { context as contextMock } from "../../__mocks__/durable-functions";
import { envConfig } from "../../__mocks__/env-config.mock";
import { CreateOrUpdateInstallationMessage } from "../../generated/notifications/CreateOrUpdateInstallationMessage";
import { PlatformEnum } from "../../generated/notifications/Platform";
import { createActivity } from "../../utils/durable/activities";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";
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
  kind: "CreateOrUpdateInstallation" as any,
  platform: PlatformEnum.apns,
  pushChannel: aPushChannel,
  tags: [aFiscalCodeHash],
};

const aNHConfig = {
  AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME,
} as NotificationHubConfig;

const createOrUpdateInstallationMock = vi.fn();
const getInstallationMock = vi.fn();

const mockNotificationHubService = {
  createOrUpdateInstallation: createOrUpdateInstallationMock,
  getInstallation: getInstallationMock,
};
const mockBuildNHClient = vi
  .fn()
  .mockImplementation(
    (_) => mockNotificationHubService as unknown as NotificationHubsClient,
  );

const mockTelemetryClient = {
  trackEvent: vi.fn(() => {}),
} as unknown as TelemetryClient;

const handler = createActivity(
  activityName,
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody(mockBuildNHClient, mockTelemetryClient),
);

describe("HandleNHCreateOrUpdateInstallationCallActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call notificationhubServicePartion.buildNHClient to get the right notificationService to call", async () => {
    getInstallationMock.mockImplementation(() =>
      Promise.resolve({
        platform: "apns",
      }),
    );
    createOrUpdateInstallationMock.mockReturnValueOnce(Promise.resolve());

    const input = ActivityInput.encode({
      installationId: aCreateOrUpdateInstallationMessage.installationId,
      notificationHubConfig: aNHConfig,
      platform: aCreateOrUpdateInstallationMessage.platform,
      pushChannel: aCreateOrUpdateInstallationMessage.pushChannel,
      tags: aCreateOrUpdateInstallationMessage.tags,
    });

    expect.assertions(3);

    const res = await handler(contextMock as any, input);
    expect(ActivityResultSuccess.is(res)).toBeTruthy();

    expect(mockBuildNHClient).toHaveBeenCalledTimes(1);
    expect(mockBuildNHClient).toBeCalledWith(aNHConfig);
  });

  it("should trigger a retry if CreateOrUpdateInstallation fails", async () => {
    getInstallationMock.mockImplementation(() =>
      Promise.resolve({
        platform: "apns",
      }),
    );
    createOrUpdateInstallationMock.mockImplementationOnce(() =>
      Promise.reject({}),
    );

    const input = ActivityInput.encode({
      installationId: aCreateOrUpdateInstallationMessage.installationId,
      notificationHubConfig: aNHConfig,
      platform: aCreateOrUpdateInstallationMessage.platform,
      pushChannel: aCreateOrUpdateInstallationMessage.pushChannel,
      tags: aCreateOrUpdateInstallationMessage.tags,
    });

    expect.assertions(2);

    try {
      await handler(contextMock as any, input);
    } catch (e) {
      expect(
        mockNotificationHubService.createOrUpdateInstallation,
      ).toHaveBeenCalledTimes(1);
      expect(e).toBeInstanceOf(Error);
    }
  });
});
