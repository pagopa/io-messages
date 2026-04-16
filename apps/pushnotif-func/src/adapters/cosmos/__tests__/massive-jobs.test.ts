import { RestError } from "@azure/core-rest-pipeline";
import { CosmosClient, ErrorResponse, ItemResponse } from "@azure/cosmos";
import { describe, expect, it, vi } from "vitest";

import { ErrorInternal, ErrorNotFound } from "../../../domain/error";
import { MassiveJob, MassiveJobID } from "../../../domain/massive-jobs";
import { CosmosMassiveJobsAdapter } from "../massive-jobs";

const mockJob: MassiveJob = {
  body: "test body",
  executionTimeInHours: 2,
  id: "01ARZ3NDEKTSV4RRFFQ69G5FAV" as MassiveJobID,
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

describe("CosmosMassiveJobsAdapter.createMassiveJob", () => {
  it("should return the item id on success", async () => {
    vi.spyOn(container.items, "create").mockResolvedValueOnce({
      item: { id: mockJob.id },
    } as unknown as ItemResponse<MassiveJob>);

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

describe("CosmosMassiveJobsAdapter.updateMassiveJob", () => {
  it("should return the item id on success", async () => {
    const mockReplace = vi.fn().mockResolvedValueOnce({
      item: { id: mockJob.id },
    } as unknown as ItemResponse<MassiveJob>);
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

describe("CosmosMassiveJobsAdapter.getMassiveJob", () => {
  it("should return the parsed job on success", async () => {
    const read = vi.fn().mockResolvedValueOnce({
      resource: mockJob,
      statusCode: 200,
    });
    vi.spyOn(container, "item").mockReturnValueOnce({ read } as never);

    const result = await adapter.getMassiveJob(mockJob.id);

    expect(result).toEqual(mockJob);
    expect(container.item).toHaveBeenCalledWith(mockJob.id, mockJob.id);
  });

  it("should return ErrorNotFound when the item is missing", async () => {
    const read = vi.fn().mockResolvedValueOnce({
      resource: undefined,
      statusCode: 404,
    });
    vi.spyOn(container, "item").mockReturnValueOnce({ read } as never);

    const result = await adapter.getMassiveJob(mockJob.id);

    expect(result).toBeInstanceOf(ErrorNotFound);
  });

  it("should return ErrorInternal when the stored job is invalid", async () => {
    const read = vi.fn().mockResolvedValueOnce({
      resource: {
        ...mockJob,
        executionTimeInHours: "invalid",
      },
      statusCode: 200,
    });
    vi.spyOn(container, "item").mockReturnValueOnce({ read } as never);

    const result = await adapter.getMassiveJob(mockJob.id);

    expect(result).toBeInstanceOf(ErrorInternal);
    expect((result as ErrorInternal).message).toBe(
      "Invalid Massive Job obtained from cosmos",
    );
  });

  it("should return ErrorInternal when reading the item fails", async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error("cosmos failure"));
    vi.spyOn(container, "item").mockReturnValueOnce({ read } as never);

    const result = await adapter.getMassiveJob(mockJob.id);

    expect(result).toBeInstanceOf(ErrorInternal);
    expect((result as ErrorInternal).message).toBe("Failed to get Massive Job");
  });
});

describe("CosmosMassiveJobsAdapter.setStatus", () => {
  it("should return the activity id on success", async () => {
    const patch = vi.fn().mockResolvedValueOnce({
      activityId: "activity-id",
    });
    vi.spyOn(container, "item").mockReturnValueOnce({ patch } as never);

    const result = await adapter.setStatus(mockJob.id, "COMPLETED");

    expect(result).toBe("activity-id");
    expect(container.item).toHaveBeenCalledWith(mockJob.id, mockJob.id);
    expect(patch).toHaveBeenCalledWith({
      operations: [{ op: "set", path: "/status", value: "COMPLETED" }],
    });
  });

  it("should return ErrorNotFound when patch receives a 404 response", async () => {
    const restError = new RestError("not found");
    restError.statusCode = 404;
    const patch = vi.fn().mockRejectedValueOnce(restError);
    vi.spyOn(container, "item").mockReturnValueOnce({ patch } as never);

    const result = await adapter.setStatus(mockJob.id, "COMPLETED");

    expect(result).toBeInstanceOf(ErrorNotFound);
  });

  it("should return ErrorInternal when patch receives an unexpected rest error", async () => {
    const restError = new RestError("forbidden");
    restError.statusCode = 403;
    const patch = vi.fn().mockRejectedValueOnce(restError);
    vi.spyOn(container, "item").mockReturnValueOnce({ patch } as never);

    const result = await adapter.setStatus(mockJob.id, "COMPLETED");

    expect(result).toBeInstanceOf(ErrorInternal);
    expect((result as ErrorInternal).message).toBe(
      `Error while patching the massive job with id: ${mockJob.id}`,
    );
  });

  it("should return ErrorInternal when patch throws a generic error", async () => {
    const patch = vi
      .fn()
      .mockRejectedValueOnce(new Error("unexpected patch failure"));
    vi.spyOn(container, "item").mockReturnValueOnce({ patch } as never);

    const result = await adapter.setStatus(mockJob.id, "COMPLETED");

    expect(result).toBeInstanceOf(ErrorInternal);
    expect((result as ErrorInternal).message).toBe(
      `Error while patching the massive job with id: ${mockJob.id}: Error: unexpected patch failure`,
    );
  });
});
