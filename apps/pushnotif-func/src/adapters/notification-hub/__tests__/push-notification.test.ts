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
    cancelScheduledNotification: vi.fn(),
    getNotificationOutcomeDetails: vi.fn(),
    scheduleNotification: vi.fn(),
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

  describe("getMassiveNotificationDetail", () => {
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

  describe("cancelScheduledNotification", () => {
    test("should return the notificationId on success", async () => {
      const { adapter, partitions } = makeAdapter();
      vi.mocked(
        partitions[2].cancelScheduledNotification,
      ).mockResolvedValueOnce({} as never);

      const result = await adapter.cancelScheduledNotification(
        notificationId,
        tag,
      );

      expect(result).toBe(notificationId);
      expect(partitions[2].cancelScheduledNotification).toHaveBeenCalledWith(
        notificationId,
      );
    });

    test("should return ErrorNotFound on RestError 404", async () => {
      const { adapter, partitions } = makeAdapter();
      vi.mocked(
        partitions[2].cancelScheduledNotification,
      ).mockRejectedValueOnce(makeRestError(404, "not found"));

      const result = await adapter.cancelScheduledNotification(
        notificationId,
        tag,
      );

      expect(result).toBeInstanceOf(ErrorNotFound);
      expect((result as ErrorNotFound).message).toContain(notificationId);
    });

    test("should return ErrorTooManyRequests on RestError 429", async () => {
      const { adapter, partitions } = makeAdapter();
      vi.mocked(
        partitions[2].cancelScheduledNotification,
      ).mockRejectedValueOnce(makeRestError(429, "too many requests"));

      const result = await adapter.cancelScheduledNotification(
        notificationId,
        tag,
      );

      expect(result).toBeInstanceOf(ErrorTooManyRequests);
    });

    test("should return ErrorInternal on other RestError status codes", async () => {
      const { adapter, partitions } = makeAdapter();
      vi.mocked(
        partitions[2].cancelScheduledNotification,
      ).mockRejectedValueOnce(makeRestError(500, "internal error"));

      const result = await adapter.cancelScheduledNotification(
        notificationId,
        tag,
      );

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).message).toContain(
        "Error while canceling the scheduled notification from notification hub",
      );
    });

    test("should return ErrorInternal on unexpected errors", async () => {
      const { adapter, partitions } = makeAdapter();
      vi.mocked(
        partitions[2].cancelScheduledNotification,
      ).mockRejectedValueOnce(new Error("unexpected"));

      const result = await adapter.cancelScheduledNotification(
        notificationId,
        tag,
      );

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).message).toContain(
        "Error while canceling the scheduled notification from notification hub",
      );
    });
  });
});

// eslint-disable-next-line max-lines-per-function
describe("NotificationHubPushNotificationAdapter.scheduleMassiveNotification", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const title = "Test notification title";
  const body = "Test notification message";
  const scheduledTimestamp = 1700000100;

  describe("Success scenarios", () => {
    test("should schedule notification to a single partition when all tags map to same partition", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["aaa", "abc", "a00"]; // All start with 'a', map to partition 2
      const expectedNotificationID = "nh-notification-id-123";

      vi.mocked(partitions[2].scheduleNotification).mockResolvedValueOnce({
        notificationId: expectedNotificationID,
      });

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toEqual([
        {
          notificationID: expectedNotificationID,
          tags,
        },
      ]);
      expect(partitions[0].scheduleNotification).not.toHaveBeenCalled();
      expect(partitions[1].scheduleNotification).not.toHaveBeenCalled();
      expect(partitions[3].scheduleNotification).not.toHaveBeenCalled();
    });

    test("should distribute tags across multiple partitions correctly", async () => {
      const { adapter, partitions } = makeAdapter();
      const tagsPartition0 = ["000", "111"]; // Start with 0-3
      const tagsPartition1 = ["444", "555"]; // Start with 4-7
      const tagsPartition2 = ["aaa", "bbb"]; // Start with 8-b
      const tagsPartition3 = ["ccc", "ddd"]; // Start with c-f
      const allTags = [
        ...tagsPartition0,
        ...tagsPartition1,
        ...tagsPartition2,
        ...tagsPartition3,
      ];

      vi.mocked(partitions[0].scheduleNotification).mockResolvedValueOnce({
        notificationId: "nh-notif-0",
      });
      vi.mocked(partitions[1].scheduleNotification).mockResolvedValueOnce({
        notificationId: "nh-notif-1",
      });
      vi.mocked(partitions[2].scheduleNotification).mockResolvedValueOnce({
        notificationId: "nh-notif-2",
      });
      vi.mocked(partitions[3].scheduleNotification).mockResolvedValueOnce({
        notificationId: "nh-notif-3",
      });

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        allTags,
      );

      expect(result).toEqual([
        { notificationID: "nh-notif-0", tags: tagsPartition0 },
        { notificationID: "nh-notif-1", tags: tagsPartition1 },
        { notificationID: "nh-notif-2", tags: tagsPartition2 },
        { notificationID: "nh-notif-3", tags: tagsPartition3 },
      ]);
      expect(partitions[0].scheduleNotification).toHaveBeenCalledTimes(1);
      expect(partitions[1].scheduleNotification).toHaveBeenCalledTimes(1);
      expect(partitions[2].scheduleNotification).toHaveBeenCalledTimes(1);
      expect(partitions[3].scheduleNotification).toHaveBeenCalledTimes(1);
    });

    test("should handle single tag input", async () => {
      const { adapter, partitions } = makeAdapter();
      const singleTag = ["abc"]; // 'a' maps to partition 2
      const expectedNotificationID = "nh-single-tag";

      vi.mocked(partitions[2].scheduleNotification).mockResolvedValueOnce({
        notificationId: expectedNotificationID,
      });

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        singleTag,
      );

      expect(result).toEqual([
        {
          notificationID: expectedNotificationID,
          tags: singleTag,
        },
      ]);
    });

    test("should handle case-insensitive tag first character when routing to partitions", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["Aaa", "ABC"]; // Uppercase, should still route to partition 2

      vi.mocked(partitions[2].scheduleNotification).mockResolvedValueOnce({
        notificationId: "nh-uppercase",
      });

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toEqual([
        {
          notificationID: "nh-uppercase",
          tags,
        },
      ]);
      expect(partitions[2].scheduleNotification).toHaveBeenCalledTimes(1);
    });

    test("should correctly convert scheduledTimestamp to Date", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["aaa"];
      const timestampInSeconds = 1700000100;
      const expectedDate = new Date(timestampInSeconds * 1000);

      vi.mocked(partitions[2].scheduleNotification).mockResolvedValueOnce({
        notificationId: "nh-id",
      });

      await adapter.scheduleMassiveNotification(
        title,
        body,
        timestampInSeconds,
        tags,
      );

      const callArgs = vi.mocked(partitions[2].scheduleNotification).mock
        .calls[0];
      expect(callArgs[0]).toEqual(expectedDate);
    });

    test("should correctly build tag expression for multiple tags in same partition", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["aaa", "abc", "a00"];

      vi.mocked(partitions[2].scheduleNotification).mockResolvedValueOnce({
        notificationId: "nh-id",
      });

      await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      const callArgs = vi.mocked(partitions[2].scheduleNotification).mock
        .calls[0];
      expect(callArgs[2]).toEqual({
        tagExpression: "massive && (aaa||abc||a00)",
      });
    });

    test("should correctly build notification payload", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["aaa"];

      vi.mocked(partitions[2].scheduleNotification).mockResolvedValueOnce({
        notificationId: "nh-id",
      });

      await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      const callArgs = vi.mocked(partitions[2].scheduleNotification).mock
        .calls[0];
      const notification = callArgs[1];
      expect(notification).toHaveProperty("body");
      expect(notification).toHaveProperty(
        "contentType",
        "application/json;charset=utf-8",
      );
      expect(notification).toHaveProperty("platform", "template");
    });
  });

  describe("Error scenarios", () => {
    test("should return ErrorInternal when notification hub returns empty notificationId", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["aaa"];

      vi.mocked(partitions[2].scheduleNotification).mockResolvedValueOnce({
        notificationId: "",
      });

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).message).toBe(
        "Empty or invalid notificationID returned from the notification hub",
      );
    });

    test("should return ErrorInternal when notification hub returns undefined notificationId", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["aaa"];

      vi.mocked(partitions[2].scheduleNotification).mockResolvedValueOnce({
        notificationId: undefined as unknown as string,
      });

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).message).toBe(
        "Empty or invalid notificationID returned from the notification hub",
      );
    });

    test("should return ErrorInternal when notification hub returns null notificationId", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["aaa"];

      vi.mocked(partitions[2].scheduleNotification).mockResolvedValueOnce({
        notificationId: null as unknown as string,
      });

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).message).toBe(
        "Empty or invalid notificationID returned from the notification hub",
      );
    });

    test("should return ErrorInternal on RestError 500", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["aaa"];

      vi.mocked(partitions[2].scheduleNotification).mockRejectedValueOnce(
        makeRestError(500, "Internal server error"),
      );

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).message).toBe(
        "Rest error while scheduling the notification",
      );
    });

    test("should return ErrorInternal on RestError 429 (rate limiting)", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["aaa"];

      vi.mocked(partitions[2].scheduleNotification).mockRejectedValueOnce(
        makeRestError(429, "Too many requests"),
      );

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).message).toBe(
        "Rest error while scheduling the notification",
      );
    });

    test("should return ErrorInternal on RestError 400", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["aaa"];

      vi.mocked(partitions[2].scheduleNotification).mockRejectedValueOnce(
        makeRestError(400, "Bad request"),
      );

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).message).toBe(
        "Rest error while scheduling the notification",
      );
    });

    test("should return ErrorInternal on generic error (non-RestError, non-ZodError)", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["aaa"];

      vi.mocked(partitions[2].scheduleNotification).mockRejectedValueOnce(
        new Error("Unexpected error"),
      );

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).message).toContain(
        "Error while scheduling the notification",
      );
    });

    test("should return ErrorInternal when scheduling fails in one partition among many", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["000", "aaa"]; // Partition 0 and 2

      vi.mocked(partitions[0].scheduleNotification).mockRejectedValueOnce(
        makeRestError(500, "Server error"),
      );

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toBeInstanceOf(ErrorInternal);
      // Should fail immediately on first error
      expect(partitions[2].scheduleNotification).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    test("should handle tags with numbers at start (partition 0)", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["000", "123", "321"];

      vi.mocked(partitions[0].scheduleNotification).mockResolvedValueOnce({
        notificationId: "nh-partition-0",
      });

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toEqual([
        {
          notificationID: "nh-partition-0",
          tags,
        },
      ]);
      expect(partitions[0].scheduleNotification).toHaveBeenCalledTimes(1);
    });

    test("should handle tags starting with 4-7 (partition 1)", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["444", "567"];

      vi.mocked(partitions[1].scheduleNotification).mockResolvedValueOnce({
        notificationId: "nh-partition-1",
      });

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toEqual([
        {
          notificationID: "nh-partition-1",
          tags,
        },
      ]);
      expect(partitions[1].scheduleNotification).toHaveBeenCalledTimes(1);
    });

    test("should handle tags starting with c-f (partition 3)", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["ccc", "ddd", "eee", "fff"];

      vi.mocked(partitions[3].scheduleNotification).mockResolvedValueOnce({
        notificationId: "nh-partition-3",
      });

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toEqual([
        {
          notificationID: "nh-partition-3",
          tags,
        },
      ]);
      expect(partitions[3].scheduleNotification).toHaveBeenCalledTimes(1);
    });

    test("should merge multiple tags into same partition correctly", async () => {
      const { adapter, partitions } = makeAdapter();
      const tags = ["aaa", "bbb", "999", "888"]; // a,b go to partition 2; 9,8 go to partition 2

      vi.mocked(partitions[2].scheduleNotification).mockResolvedValueOnce({
        notificationId: "nh-merged",
      });

      const result = await adapter.scheduleMassiveNotification(
        title,
        body,
        scheduledTimestamp,
        tags,
      );

      expect(result).toEqual([
        {
          notificationID: "nh-merged",
          tags,
        },
      ]);
      expect(partitions[2].scheduleNotification).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(partitions[2].scheduleNotification).mock
        .calls[0];
      expect(callArgs[2]).toEqual({
        tagExpression: "massive && (aaa||bbb||999||888)",
      });
    });
  });
});
