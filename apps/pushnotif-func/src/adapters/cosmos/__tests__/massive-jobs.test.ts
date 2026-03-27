import { Container, Database, ErrorResponse, Item } from "@azure/cosmos";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorInternal, ErrorNotFound } from "../../../domain/error";
import { MassiveJob } from "../../../domain/massive-jobs";
import { CosmosMassiveJobsAdapter } from "../massive-jobs";

const mockJob: MassiveJob = {
  body: "test body",
  executionTimeInHours: 2,
  id: "00000000-0000-0000-0000-000000000001",
  startTimeTimestamp: 1000000000,
  status: "CREATED",
  title: "test title",
};

describe("CosmosMassiveJobsAdapter", () => {
  const mockContainerName = "massive-jobs";
  let mockDatabase: Database;
  let mockContainer: Container;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockUpsert: ReturnType<typeof vi.fn>;
  let adapter: CosmosMassiveJobsAdapter;

  beforeEach(() => {
    mockCreate = vi.fn();
    mockUpsert = vi.fn();

    mockContainer = {
      items: {
        create: mockCreate,
        upsert: mockUpsert,
      },
    } as unknown as Container;

    mockDatabase = {
      container: vi.fn().mockReturnValue(mockContainer),
    } as unknown as Database;

    adapter = new CosmosMassiveJobsAdapter(mockDatabase, mockContainerName);
  });

  describe("createMassiveJob", () => {
    it("should return the item id on success", async () => {
      mockCreate.mockResolvedValueOnce({
        item: { id: mockJob.id },
      } as unknown as Item);

      const result = await adapter.createMassiveJob(mockJob);

      expect(result).toBe(mockJob.id);
      expect(mockDatabase.container).toHaveBeenCalledWith(mockContainerName);
      expect(mockCreate).toHaveBeenCalledWith(mockJob);
    });

    it("should return ErrorInternal when create throws", async () => {
      mockCreate.mockRejectedValueOnce(new Error("cosmos failure"));

      const result = await adapter.createMassiveJob(mockJob);

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).code).toBe("500");
    });
  });

  describe("updateMassiveJob", () => {
    it("should return the item id on success", async () => {
      mockUpsert.mockResolvedValueOnce({
        item: { id: mockJob.id },
      } as unknown as Item);

      const result = await adapter.updateMassiveJob(mockJob);

      expect(result).toBe(mockJob.id);
      expect(mockDatabase.container).toHaveBeenCalledWith(mockContainerName);
      expect(mockUpsert).toHaveBeenCalledWith(mockJob, {});
    });

    it("should return ErrorNotFound when cosmos responds with 404", async () => {
      const notFoundError = new ErrorResponse("Not Found");
      notFoundError.code = 404;
      mockUpsert.mockRejectedValueOnce(notFoundError);

      const result = await adapter.updateMassiveJob(mockJob);

      expect(result).toBeInstanceOf(ErrorNotFound);
      expect((result as ErrorNotFound).code).toBe("404");
    });

    it("should return ErrorInternal when cosmos responds with non-404 ErrorResponse", async () => {
      const serverError = new ErrorResponse("Internal Server Error");
      serverError.code = 500;
      mockUpsert.mockRejectedValueOnce(serverError);

      const result = await adapter.updateMassiveJob(mockJob);

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).code).toBe("500");
    });

    it("should return ErrorInternal when upsert throws a generic error", async () => {
      mockUpsert.mockRejectedValueOnce(new Error("unexpected failure"));

      const result = await adapter.updateMassiveJob(mockJob);

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).code).toBe("500");
    });
  });
});
