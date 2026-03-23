import { InvocationContext } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  ErrorInternal,
  ErrorNotFound,
  ErrorTooManyRequests,
} from "../../../domain/error";
import { InstallationRepository } from "../../../domain/push-service";
import { TelemetryService } from "../../../domain/telemetry";
import getUpdateInstallationHandler from "../update-installation";

const invocationContext = new InvocationContext();

const aValidInstallationId =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const telemetryServiceMock: TelemetryService = {
  trackEvent: vi.fn(),
};

const installationRepositoryMock: InstallationRepository = {
  updateInstallation: vi.fn(),
};

const handler = getUpdateInstallationHandler(
  telemetryServiceMock,
  installationRepositoryMock,
);

describe("getUpdateInstallationHandler", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should call updateInstallation with the apns body template when platform is Apns", async () => {
    vi.mocked(
      installationRepositoryMock.updateInstallation,
    ).mockResolvedValueOnce(aValidInstallationId);

    const message = { installationId: aValidInstallationId, platform: "Apns" };

    await expect(handler(message, invocationContext)).resolves.toBeUndefined();

    expect(installationRepositoryMock.updateInstallation).toHaveBeenCalledWith(
      aValidInstallationId,
      expect.arrayContaining([
        expect.objectContaining({
          op: "add",
          path: "/templates/massive/body",
          value: expect.stringContaining('"aps"'),
        }),
      ]),
    );

    expect(telemetryServiceMock.trackEvent).not.toHaveBeenCalled();
  });

  test("should call updateInstallation with the fcmv1 body template when platform is FcmV1", async () => {
    vi.mocked(
      installationRepositoryMock.updateInstallation,
    ).mockResolvedValueOnce(aValidInstallationId);

    const message = {
      installationId: aValidInstallationId,
      platform: "FcmV1",
    };

    await expect(handler(message, invocationContext)).resolves.toBeUndefined();

    expect(installationRepositoryMock.updateInstallation).toHaveBeenCalledWith(
      aValidInstallationId,
      expect.arrayContaining([
        expect.objectContaining({
          op: "add",
          path: "/templates/massive/body",
          value: expect.stringContaining('"android"'),
        }),
      ]),
    );

    expect(telemetryServiceMock.trackEvent).not.toHaveBeenCalled();
  });

  test("should track a telemetry event and not call updateInstallation when the queue message is invalid", async () => {
    const invalidMessage = { invalidField: "value" };

    await expect(
      handler(invalidMessage, invocationContext),
    ).resolves.toBeUndefined();

    expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
      "installation.update.message.validation.error",
      expect.objectContaining({
        message: "Invalid updateInstallationMessage in the queue",
      }),
    );

    expect(
      installationRepositoryMock.updateInstallation,
    ).not.toHaveBeenCalled();
  });

  test("should resolve without throwing when the installation is not found", async () => {
    vi.mocked(
      installationRepositoryMock.updateInstallation,
    ).mockResolvedValueOnce(new ErrorNotFound("Installation not found"));

    const message = { installationId: aValidInstallationId, platform: "Apns" };

    await expect(handler(message, invocationContext)).resolves.toBeUndefined();

    expect(
      installationRepositoryMock.updateInstallation,
    ).toHaveBeenCalledOnce();
  });

  test("should throw when updateInstallation returns a ErrorInternal", async () => {
    vi.mocked(
      installationRepositoryMock.updateInstallation,
    ).mockResolvedValueOnce(new ErrorInternal("Update failed"));

    const message = { installationId: aValidInstallationId, platform: "Apns" };

    await expect(handler(message, invocationContext)).rejects.toThrow(
      "Update failed",
    );

    expect(
      installationRepositoryMock.updateInstallation,
    ).toHaveBeenCalledOnce();
  });

  test("should throw when updateInstallation returns a ErrorTooManyRequests", async () => {
    vi.mocked(
      installationRepositoryMock.updateInstallation,
    ).mockResolvedValueOnce(new ErrorTooManyRequests("Too many requests"));

    const message = { installationId: aValidInstallationId, platform: "Apns" };

    await expect(handler(message, invocationContext)).rejects.toThrow(
      "Too many requests",
    );

    expect(
      installationRepositoryMock.updateInstallation,
    ).toHaveBeenCalledOnce();
  });
});
