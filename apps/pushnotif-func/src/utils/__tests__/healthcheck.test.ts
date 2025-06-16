import { NotificationHubsClient } from "@azure/notification-hubs";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { describe, expect, it, vi } from "vitest";

import { nhPartitionFactory } from "../../__mocks__/notification-hub";
import { checkAzureNotificationHub } from "../healthcheck";

vi.spyOn(
  NotificationHubsClient.prototype,
  "deleteInstallation",
).mockResolvedValue({});

const aFiscalCodeHash =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

describe("healthcheck - notification hub", () => {
  it("should not throw exception", async () => {
    await pipe(
      checkAzureNotificationHub(nhPartitionFactory, aFiscalCodeHash),
      TE.map(() => {
        expect(true).toBe(true);
      }),
    )();

    expect.assertions(1);
  });

  it("should throw exception", async () => {
    vi.spyOn(nhPartitionFactory, "getPartition").mockImplementationOnce(() => {
      throw new Error("Error obtaining the partition");
    });

    await pipe(
      checkAzureNotificationHub(nhPartitionFactory, aFiscalCodeHash),
      TE.mapLeft((err) => {
        expect(err.length).toBe(1);
        expect(true).toBe(true);
      }),
      TE.map(() => {
        expect(true).toBeFalsy();
      }),
    )();

    expect.assertions(2);
  });
});
