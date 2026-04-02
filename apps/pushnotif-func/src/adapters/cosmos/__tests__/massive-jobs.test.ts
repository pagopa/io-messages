import { CosmosClient, ErrorResponse, ItemResponse } from "@azure/cosmos";
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

const cosmosClient = new CosmosClient({
  endpoint: "https://localhost",
});
const database = cosmosClient.database("test-database");
const container = database.container("test-container");
const adapter = new CosmosMassiveJobsAdapter(container);

describe("CosmosMassiveJobsAdapter", () => {
  beforeEach(() => {});

  describe("createMassiveJob", () => {
    it("should return the item id on success", async () => {
      vi.spyOn(container.items, "create").mockResolvedValueOnce({
        item: { id: mockJob.id },
      } as ItemResponse<MassiveJob>);

      const result = await adapter.createMassiveJob(mockJob);

      expect(result).toBe(mockJob.id);
    });

    it("should return ErrorInternal when create throws", async () => {
      vi.spyOn(container.items, "create").mockRejectedValueOnce(
        new Error("cosmos failure"),
      );

      const result = await adapter.createMassiveJob(mockJob);

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).code).toBe("500");
    });
  });

  describe("updateMassiveJob", () => {
    it("should return the item id on success", async () => {
      const mockReplace = vi.fn().mockResolvedValueOnce({
        item: { id: mockJob.id },
      } as ItemResponse<MassiveJob>);
      const mockItem = vi.fn().mockReturnValue({ replace: mockReplace });
      vi.spyOn(container, "item").mockReturnValueOnce(mockItem());

      const result = await adapter.updateMassiveJob(mockJob);

      expect(result).toBe(mockJob.id);
      expect(container.item).toHaveBeenCalledWith(mockJob.id);
      expect(mockReplace).toHaveBeenCalledWith(mockJob);
    });

    it("should return ErrorNotFound when cosmos responds with 404", async () => {
      const notFoundError = new ErrorResponse("Not Found");
      notFoundError.code = 404;
      const mockReplace = vi.fn().mockRejectedValueOnce(notFoundError);
      const mockItem = vi.fn().mockReturnValue({ replace: mockReplace });
      vi.spyOn(container, "item").mockReturnValueOnce(mockItem());

      mockReplace.mockRejectedValueOnce(notFoundError);

      const result = await adapter.updateMassiveJob(mockJob);

      expect(result).toBeInstanceOf(ErrorNotFound);
      expect((result as ErrorNotFound).code).toBe("404");
    });

    it("should return ErrorInternal when cosmos responds with non-404 ErrorResponse", async () => {
      const serverError = new ErrorResponse("Internal Server Error");
      serverError.code = 500;
      const mockReplace = vi.fn().mockRejectedValueOnce(serverError);
      const mockItem = vi.fn().mockReturnValue({ replace: mockReplace });
      vi.spyOn(container, "item").mockReturnValueOnce(mockItem());

      const result = await adapter.updateMassiveJob(mockJob);

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).code).toBe("500");
    });

    it("should return ErrorInternal when replace throws a generic error", async () => {
      const mockReplace = vi
        .fn()
        .mockRejectedValueOnce(new Error("unexpected failure"));
      const mockItem = vi.fn().mockReturnValue({ replace: mockReplace });
      vi.spyOn(container, "item").mockReturnValueOnce(mockItem());

      const result = await adapter.updateMassiveJob(mockJob);

      expect(result).toBeInstanceOf(ErrorInternal);
      expect((result as ErrorInternal).code).toBe("500");
    });
  });
});
