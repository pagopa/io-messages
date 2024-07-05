import { RestError } from "@azure/core-rest-pipeline";
import {
  AppleInstallation,
  FcmLegacyInstallation,
  NotificationHubsClient,
} from "@azure/notification-hubs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { migrateGcmInstallationToFcmV1 } from "../index.js";

const getInstallationMock = vi.fn();
const createOrUpdateInstallationMock = vi.fn();

const nhClientPartitionMock = {
  createOrUpdateInstallation: createOrUpdateInstallationMock,
  getInstallation: getInstallationMock,
} as unknown as NotificationHubsClient;

describe("migrateGcmInstallationToFcmV1", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return void without calling createOrUpdateInstallation if the installation was not found", async () => {
    getInstallationMock.mockReturnValueOnce(
      Promise.reject(
        new RestError("Installation not found", { statusCode: 404 }),
      ),
    );
    const notFoundInstallationId = "0installationNotFound";
    await migrateGcmInstallationToFcmV1(
      notFoundInstallationId,
      nhClientPartitionMock,
    );
    expect(getInstallationMock).toHaveBeenCalledTimes(1);
    expect(createOrUpdateInstallationMock).not.toHaveBeenCalled();
  });

  it("should return void without calling createOrUpdateInstallation if the installation was not gcm", async () => {
    const anAppleInstallation = {
      platform: "apns",
    } as unknown as AppleInstallation;
    getInstallationMock.mockReturnValueOnce(
      Promise.resolve(anAppleInstallation),
    );
    await migrateGcmInstallationToFcmV1(
      "0anAppleInstallationId",
      nhClientPartitionMock,
    );
    expect(getInstallationMock).toHaveBeenCalledTimes(1);
    expect(createOrUpdateInstallationMock).not.toHaveBeenCalled();
  });

  it("should throw an error calling createOrUpdateInstallation if the installation was gcm", async () => {
    const aGcmInstallation = {
      platform: "gcm",
    } as unknown as FcmLegacyInstallation;
    getInstallationMock.mockReturnValueOnce(Promise.resolve(aGcmInstallation));
    createOrUpdateInstallationMock.mockReturnValueOnce(
      Promise.reject("Something went wrong"),
    );
    await expect(
      migrateGcmInstallationToFcmV1(
        "0aGcmInstallationId",
        nhClientPartitionMock,
      ),
    ).rejects.toThrowError();
    expect(getInstallationMock).toHaveBeenCalledTimes(1);
    expect(createOrUpdateInstallationMock).toHaveBeenCalledTimes(1);
  });
});
