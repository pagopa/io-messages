import { Container, Database, Item } from "@azure/cosmos";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InstallationSummary } from "../../../domain/installation";
import { CosmosInstallationAdapter } from "../installation";

interface AdapterInternals {
  computePartitionId: (installationId: string) => string;
  getContainer: () => Container;
}

describe("CosmosInstallationAdapter", () => {
  const mockContainerName = "installations";
  let mockDatabase: Database;
  let mockContainer: Container;
  let mockItem: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockUpsert: ReturnType<typeof vi.fn>;
  let adapter: CosmosInstallationAdapter;

  const getAdapterInternals = (): AdapterInternals =>
    adapter as unknown as AdapterInternals;

  beforeEach(() => {
    mockItem = vi.fn();
    mockDelete = vi.fn();
    mockUpsert = vi.fn();

    mockItem.mockReturnValue({
      delete: mockDelete,
    });

    mockContainer = {
      item: mockItem,
      items: {
        upsert: mockUpsert,
      },
    } as unknown as Container;

    mockDatabase = {
      container: vi.fn().mockReturnValue(mockContainer),
    } as unknown as Database;

    adapter = new CosmosInstallationAdapter(mockDatabase, mockContainerName);
  });

  describe("computePartitionId", () => {
    it.each([
      ["0abc123", "1"],
      ["3def456", "1"],
      ["4ghi789", "2"],
      ["7jkl012", "2"],
      ["8mno345", "3"],
      ["bpqr678", "3"],
      ["cstu901", "4"],
      ["fvwx234", "4"],
    ])("should compute partition %s -> %s", (installationId, expected) => {
      const result = getAdapterInternals().computePartitionId(installationId);
      expect(result).toBe(expected);
    });

    it("should throw error for unexpected character", () => {
      expect(() => getAdapterInternals().computePartitionId("g123456")).toThrow(
        "Unexpected character [g] in installationId: g123456",
      );
    });
  });

  describe("createOrUpdateInstallation", () => {
    it("should successfully create or update installation", async () => {
      const dateNow = Date.now();
      const installation: InstallationSummary = {
        id: "abc123def456",
        nhPartition: "3",
        platform: "fcmv1",
        updatedAt: dateNow,
      } as InstallationSummary;

      mockUpsert.mockResolvedValueOnce({
        item: { id: installation.id },
      } as unknown as Item);

      const result = await adapter.createOrUpdateInstallation(installation);

      expect(result).toBe(installation.id);
      expect(mockDatabase.container).toHaveBeenCalledWith(mockContainerName);
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          id: installation.id,
          nhPartition: installation.nhPartition,
          platform: installation.platform,
          updatedAt: installation.updatedAt,
        },
        {},
      );
    });

    it("should return error when upsert fails", async () => {
      const installation: InstallationSummary = {
        id: "abc123def456",
        nhPartition: "3",
        platform: "fcmv1",
        updatedAt: Date.now(),
      } as InstallationSummary;

      mockUpsert.mockRejectedValueOnce(new Error("Cosmos error"));

      await expect(
        adapter.createOrUpdateInstallation(installation),
      ).rejects.toThrow(
        `Failed to create or update installation: Cosmos error`,
      );
    });
  });

  describe("deleteInstallation", () => {
    it("should successfully delete installation", async () => {
      const installationId = "abc123def456";

      mockDelete.mockResolvedValueOnce({
        item: { id: installationId },
      } as unknown as Item);

      const result = await adapter.deleteInstallation(installationId);

      expect(result).toBe(installationId);
      expect(mockDatabase.container).toHaveBeenCalledWith(mockContainerName);
      expect(mockItem).toHaveBeenCalledWith(installationId, "3");
      expect(mockDelete).toHaveBeenCalledWith();
    });

    it("should not find installation but proceed without error", async () => {
      const installationId = "abc123def456";
      const notFoundError = new Error("Not found") as { code: number } & Error;
      notFoundError.code = 404;

      mockDelete.mockRejectedValueOnce(notFoundError);

      const result = await adapter.deleteInstallation(installationId);

      expect(result).toBe(installationId);
      expect(mockDatabase.container).toHaveBeenCalledWith(mockContainerName);
      expect(mockItem).toHaveBeenCalledWith(installationId, "3");
      expect(mockDelete).toHaveBeenCalledWith();
    });

    it("should return error when delete fails", async () => {
      const installationId = "abc123def456";

      mockDelete.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(adapter.deleteInstallation(installationId)).rejects.toThrow(
        `Failed to delete installation: Delete failed`,
      );
    });
  });

  describe("getContainer", () => {
    it("should return container instance", () => {
      const container = getAdapterInternals().getContainer();

      expect(mockDatabase.container).toHaveBeenCalledWith(mockContainerName);
      expect(container).toBe(mockContainer);
    });
  });
});
