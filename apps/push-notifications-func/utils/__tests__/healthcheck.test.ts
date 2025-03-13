import { envConfig } from "../../__mocks__/env-config.mock";

import { checkAzureNotificationHub } from "../healthcheck";

import { pipe } from "fp-ts/lib/function";

import * as TE from "fp-ts/lib/TaskEither";
import { NotificationHubsClient } from "@azure/notification-hubs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// const mockNotificationHubServiceKO = {
//   deleteInstallation: vi.fn((_, callback) =>
//     callback(Error("An error occurred"), null),
//   ),
// } as unknown as NotificationHubsClient;

// const mockNotificationHubServiceOK = {
//   deleteInstallation: vi.fn((_) => Promise.resolve({})),
// } as unknown as NotificationHubsClient;

// -------------
// TESTS
// -------------
import * as nhService from "../notificationhubServicePartition"; // Module containing buildNHClient

vi.mock("../notificationhubServicePartition", () => {
  return {
    buildNHClient: vi.fn(() => ({
      deleteInstallation: vi.fn(() => Promise.resolve({})), // Mock `deleteInstallation` to resolve successfully
    })),
  };
});

const buildNHClientMock = vi.spyOn(nhService, "buildNHClient");

describe("healthcheck - notification hub", () => {
  // afterEach(() => {
  //   vi.resetAllMocks();
  // });
  it("should not throw exception", async () => {
    await pipe(
      checkAzureNotificationHub(
        envConfig.AZURE_NH_ENDPOINT,
        envConfig.AZURE_NH_HUB_NAME,
      ),
      TE.map((_) => {
        expect(true).toBe(true);
      }),
    )();

    expect.assertions(1);
  });

  it("should throw exception", async () => {
    buildNHClientMock.mockRejectedValue(true);

    await pipe(
      checkAzureNotificationHub(
        envConfig.AZURE_NH_ENDPOINT,
        envConfig.AZURE_NH_HUB_NAME,
      ),
      TE.mapLeft((err) => {
        expect(err.length).toBe(1);
        expect(true).toBe(true);
      }),
      TE.map((_) => {
        expect(true).toBeFalsy();
      }),
    )();

    expect.assertions(2);
  });
});
