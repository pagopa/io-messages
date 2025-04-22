import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { describe, expect, it, vi } from "vitest";

import { envConfig } from "../../__mocks__/env-config.mock";
import { checkAzureNotificationHub } from "../healthcheck";
import * as nhService from "../notificationhubServicePartition"; // Module containing buildNHClient

vi.mock("../notificationhubServicePartition", () => ({
  buildNHClient: vi.fn(() => ({
    deleteInstallation: vi.fn(() => Promise.resolve({})), // Mock `deleteInstallation` to resolve successfully
  })),
}));

const buildNHClientMock = vi.spyOn(nhService, "buildNHClient");

describe("healthcheck - notification hub", () => {
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
