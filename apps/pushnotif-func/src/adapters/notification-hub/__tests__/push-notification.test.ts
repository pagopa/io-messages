import { RestError } from "@azure/core-rest-pipeline";
import { NotificationHubsClient } from "@azure/notification-hubs";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  ErrorInternal,
  ErrorNotFound,
  ErrorTooManyRequests,
} from "../../../domain/error";
import { NotificationDetailStatus } from "../../../domain/push-service";
import { NotificationHubPushNotificationAdapter } from "../push-notification";

const notificationId = "550e8400-e29b-41d4-a716-446655440000";
const tag = "aaa";

const makeNhClientMock = () =>
  ({
    getNotificationOutcomeDetails: vi.fn(),
  }) as unknown as NotificationHubsClient;

const makeRestError = (statusCode: number, message = "error") => {
  const err = new RestError(message);
  err.statusCode = statusCode;
  return err;
};

const makeAdapter = (
  partitions = [
    makeNhClientMock(),
    makeNhClientMock(),
    makeNhClientMock(),
    makeNhClientMock(),
  ],
) => ({
  adapter: new NotificationHubPushNotificationAdapter(partitions, [
    new RegExp("^[0-3]"),
    new RegExp("^[4-7]"),
    new RegExp("^[8-b]"),
    new RegExp("^[c-f]"),
  ]),
  partitions,
});

describe("NotificationHubPushNotificationAdapter", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should return parsed notification details from the matched partition", async () => {
    const { adapter, partitions } = makeAdapter();
    vi.mocked(
      partitions[2].getNotificationOutcomeDetails,
    ).mockResolvedValueOnce({
      notificationId,
      state: "Completed",
    });

    const result = await adapter.getMassiveNotificationDetail(
      notificationId,
      tag,
    );

    expect(result).toEqual({
      notificationId,
      state: "Completed",
    });
    expect(partitions[2].getNotificationOutcomeDetails).toHaveBeenCalledWith(
      notificationId,
    );
  });

  test("should return ErrorInternal when Notification Hub returns an invalid payload", async () => {
    const { adapter, partitions } = makeAdapter();
    vi.mocked(
      partitions[2].getNotificationOutcomeDetails,
    ).mockResolvedValueOnce({
      notificationId,
      state: "InvalidState" as unknown as NotificationDetailStatus,
    });

    const result = await adapter.getMassiveNotificationDetail(
      notificationId,
      tag,
    );

    expect(result).toBeInstanceOf(ErrorInternal);
    expect((result as ErrorInternal).message).toBe(
      "Invalid notification detail received from Notification Hub",
    );
  });

  test("should return ErrorNotFound on RestError 404", async () => {
    const { adapter, partitions } = makeAdapter();
    vi.mocked(
      partitions[2].getNotificationOutcomeDetails,
    ).mockRejectedValueOnce(makeRestError(404, "not found"));

    const result = await adapter.getMassiveNotificationDetail(
      notificationId,
      tag,
    );

    expect(result).toBeInstanceOf(ErrorNotFound);
  });

  test("should return ErrorTooManyRequests on RestError 429", async () => {
    const { adapter, partitions } = makeAdapter();
    vi.mocked(
      partitions[2].getNotificationOutcomeDetails,
    ).mockRejectedValueOnce(makeRestError(429, "too many requests"));

    const result = await adapter.getMassiveNotificationDetail(
      notificationId,
      tag,
    );

    expect(result).toBeInstanceOf(ErrorTooManyRequests);
  });

  test("should return ErrorInternal on unexpected errors", async () => {
    const { adapter, partitions } = makeAdapter();
    vi.mocked(
      partitions[2].getNotificationOutcomeDetails,
    ).mockRejectedValueOnce(new Error("unexpected"));

    const result = await adapter.getMassiveNotificationDetail(
      notificationId,
      tag,
    );

    expect(result).toBeInstanceOf(ErrorInternal);
    expect((result as ErrorInternal).message).toContain(
      "Error while getting the notification from notification hub",
    );
  });
});
