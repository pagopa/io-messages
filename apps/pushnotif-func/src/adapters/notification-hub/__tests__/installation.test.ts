import { NotificationHubsClient } from "@azure/notification-hubs";
import { RestError } from "@azure/storage-queue";
import { describe, expect, test, vi } from "vitest";

import { ErrorNotFound } from "../../../domain/error";
import { NotificationHubInstallationAdapter } from "../installaiton";

const anInstallationId =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // starts with 'e'

const aJsonPatch = [
  { op: "add" as const, path: "/templates/massive/body", value: '{"aps":{}}' },
];

const makeNhClientMock = () =>
  ({
    getInstallation: vi.fn(),
    updateInstallation: vi.fn(),
  }) as unknown as NotificationHubsClient;

const makeRestError = (statusCode: number) => {
  const err = new RestError("error");
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
  adapter: new NotificationHubInstallationAdapter(partitions),
  partitions,
});

describe("NotificationHubInstallationAdapter", () => {
  describe("updateInstallation", () => {
    test("should return the installation id on success", async () => {
      const { adapter, partitions } = makeAdapter();
      vi.mocked(partitions[3].updateInstallation).mockResolvedValueOnce({});

      const result = await adapter.updateInstallation(
        anInstallationId,
        aJsonPatch,
      );

      expect(result).toBe(anInstallationId);
      expect(partitions[3].updateInstallation).toHaveBeenCalledWith(
        anInstallationId,
        aJsonPatch,
      );
    });

    test("should return ErrorNotFound on RestError 404", async () => {
      const { adapter, partitions } = makeAdapter();
      vi.mocked(partitions[3].updateInstallation).mockRejectedValueOnce(
        makeRestError(404),
      );

      const result = await adapter.updateInstallation(
        anInstallationId,
        aJsonPatch,
      );

      expect(result).toBeInstanceOf(ErrorNotFound);
    });

    test("should return Error on RestError 429 (too many requests)", async () => {
      const { adapter, partitions } = makeAdapter();
      vi.mocked(partitions[3].updateInstallation).mockRejectedValueOnce(
        makeRestError(429),
      );

      const result = await adapter.updateInstallation(
        anInstallationId,
        aJsonPatch,
      );

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain("Too many request");
    });

    test("should return Error on other RestError status codes", async () => {
      const { adapter, partitions } = makeAdapter();
      vi.mocked(partitions[3].updateInstallation).mockRejectedValueOnce(
        makeRestError(500),
      );

      const result = await adapter.updateInstallation(
        anInstallationId,
        aJsonPatch,
      );

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain(
        "Generic error from notification hub",
      );
    });

    test("should return Error on unexpected errors", async () => {
      const { adapter, partitions } = makeAdapter();
      vi.mocked(partitions[3].updateInstallation).mockRejectedValueOnce(
        new Error("unexpected"),
      );

      const result = await adapter.updateInstallation(
        anInstallationId,
        aJsonPatch,
      );

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain(
        "Error from notification hub",
      );
    });
  });
});
