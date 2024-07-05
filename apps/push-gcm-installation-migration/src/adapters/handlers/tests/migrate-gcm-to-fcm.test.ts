import { NotificationHubClients } from "@/domain/notification-hub.js";
import { RestError } from "@azure/core-rest-pipeline";
import {
  AppleInstallation,
  FcmLegacyInstallation,
  NotificationHubsClient,
} from "@azure/notification-hubs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  migrateGcmInstallationToFcmV1,
  nhPartitionSelector,
} from "../migrate-gcm-to-fcm.js";

const getInstallationMock = vi.fn();
const createOrUpdateInstallationMock = vi.fn();

const nhClientPartitionMock = {
  createOrUpdateInstallation: createOrUpdateInstallationMock,
  getInstallation: getInstallationMock,
} as unknown as NotificationHubsClient;

const nhClientsMock: NotificationHubClients = {
  nhClientPartition1: nhClientPartitionMock,
  nhClientPartition2: nhClientPartitionMock,
  nhClientPartition3: nhClientPartitionMock,
  nhClientPartition4: nhClientPartitionMock,
};

describe("nhPartitionSelector", () => {
  it("Should return an error if the installationId is invalid", () => {
    expect.assertions(1);
    const partition = nhPartitionSelector(nhClientsMock, "");
    if (partition instanceof Error)
      expect(partition.message).toBe("Invalid installationId");
  });

  it("Should return a NotificationHubsClient if the installationId is valid", () => {
    const partition = nhPartitionSelector(
      nhClientsMock,
      "aValidInstallationId",
    );
    expect(partition).toHaveProperty("getInstallation");
  });
});

describe("migrateGcmInstallationToFcmV1", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  it("should return void without calling getInstallation and createOrUpdateInstallation if the installationId is invalid", async () => {
    const invalidInstallationId = "";
    await migrateGcmInstallationToFcmV1(invalidInstallationId, nhClientsMock);
    expect(getInstallationMock).not.toHaveBeenCalled();
    expect(createOrUpdateInstallationMock).not.toHaveBeenCalled();
  });

  it("should return void without calling createOrUpdateInstallation if the installation was not found", async () => {
    getInstallationMock.mockReturnValueOnce(
      Promise.resolve(
        new RestError("Installation not found", { statusCode: 404 }),
      ),
    );
    const notFoundInstallationId = "0installationNotFound";
    await migrateGcmInstallationToFcmV1(notFoundInstallationId, nhClientsMock);
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
      nhClientsMock,
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
      migrateGcmInstallationToFcmV1("0aGcmInstallationId", nhClientsMock),
    ).rejects.toThrowError();
    expect(getInstallationMock).toHaveBeenCalledTimes(1);
    expect(createOrUpdateInstallationMock).toHaveBeenCalledTimes(1);
  });
});
