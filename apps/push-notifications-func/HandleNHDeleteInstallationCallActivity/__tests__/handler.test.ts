import { NotificationHubsClient } from "@azure/notification-hubs";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { context as contextMock } from "../../__mocks__/durable-functions";
import { envConfig } from "../../__mocks__/env-config.mock";
import {
  ActivityResultFailure,
  createActivity,
} from "../../utils/durable/activities";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";
import {
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody,
} from "../handler";

const aFiscalCodeHash =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const anInstallationId = aFiscalCodeHash;

const aNHConfig = {
  AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME,
} as NotificationHubConfig;

const mockNotificationHubService = {
  deleteInstallation: vi.fn(),
};
const mockBuildNHClient = vi
  .fn()
  .mockImplementation(
    () => mockNotificationHubService as unknown as NotificationHubsClient,
  );

const mockTelemetryClient = {
  trackEvent: vi.fn().mockImplementation(() => {}),
} as unknown as TelemetryClient;

const handler = createActivity(
  "HandleNHDeleteInstallationCallActivity",
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody(mockBuildNHClient, mockTelemetryClient),
);

describe("HandleNHDeleteInstallationCallActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should call deleteInstallation with right NH parameters", async () => {
    vi.spyOn(
      mockNotificationHubService,
      "deleteInstallation",
    ).mockImplementation(() => Promise.resolve({}));

    const input = ActivityInput.encode({
      installationId: anInstallationId,
      notificationHubConfig: aNHConfig,
    });
    const res = await handler(contextMock, input);
    expect(mockNotificationHubService.deleteInstallation).toHaveBeenCalledTimes(
      1,
    );

    expect(mockBuildNHClient).toHaveBeenCalledWith(aNHConfig);

    expect(ActivityResultSuccess.is(res)).toBeTruthy();
  });

  it("should NOT trigger a retry if deleteInstallation fails", async () => {
    vi.spyOn(
      mockNotificationHubService,
      "deleteInstallation",
    ).mockImplementation((_, cb) => cb(new Error("deleteInstallation error")));

    const input = ActivityInput.encode({
      installationId: anInstallationId,
      notificationHubConfig: aNHConfig,
    });
    const res = await handler(contextMock, input);
    expect(mockNotificationHubService.deleteInstallation).toHaveBeenCalledTimes(
      1,
    );
    expect(ActivityResultFailure.is(res)).toBeTruthy();
  });
});
