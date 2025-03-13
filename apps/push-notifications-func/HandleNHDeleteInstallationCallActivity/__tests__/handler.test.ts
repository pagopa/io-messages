import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { context as contextMock } from "../../__mocks__/durable-functions";
import {
  getActivityBody,
  ActivityInput,
  ActivityResultSuccess,
} from "../handler";

import { envConfig } from "../../__mocks__/env-config.mock";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";
import {
  ActivityResultFailure,
  createActivity,
} from "../../utils/durable/activities";
import { NotificationHubsClient } from "@azure/notification-hubs";
import { TelemetryClient } from "applicationinsights";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    (_) => mockNotificationHubService as unknown as NotificationHubsClient,
  );

const mockTelemetryClient = {
  trackEvent: vi.fn().mockImplementation(() => {}),
} as unknown as TelemetryClient;

const handler = createActivity(
  "HandleNHDeleteInstallationCallActivity",
  ActivityInput, // FIXME: the editor marks it as type error, but tests compile correctly
  ActivityResultSuccess,
  getActivityBody(mockBuildNHClient, mockTelemetryClient),
);

describe("HandleNHDeleteInstallationCallActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should call deleteInstallation with right NH parameters", async () => {
    mockNotificationHubService.deleteInstallation = vi
      .fn()
      .mockImplementation((_) => Promise.resolve({}));

    const input = ActivityInput.encode({
      installationId: anInstallationId,
      notificationHubConfig: aNHConfig,
    });
    const res = await handler(contextMock as any, input);
    expect(mockNotificationHubService.deleteInstallation).toHaveBeenCalledTimes(
      1,
    );

    expect(mockBuildNHClient).toHaveBeenCalledWith(aNHConfig);

    expect(ActivityResultSuccess.is(res)).toBeTruthy();
  });

  it("should NOT trigger a retry if deleteInstallation fails", async () => {
    mockNotificationHubService.deleteInstallation = vi
      .fn()
      .mockImplementation((_, cb) => cb(new Error("deleteInstallation error")));

    const input = ActivityInput.encode({
      installationId: anInstallationId,
      notificationHubConfig: aNHConfig,
    });
    const res = await handler(contextMock as any, input);
    expect(mockNotificationHubService.deleteInstallation).toHaveBeenCalledTimes(
      1,
    );
    expect(ActivityResultFailure.is(res)).toBeTruthy();
  });
});
