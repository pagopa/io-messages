import { RestError } from "@azure/core-rest-pipeline";
import { CosmosClient, SqlQuerySpec } from "@azure/cosmos";
import { describe, expect, it, vi } from "vitest";

import {
  ErrorInternal,
  ErrorNotFound,
  ErrorTooManyRequests,
} from "../../../domain/error";
import { massiveJobIDSchema } from "../../../domain/massive-jobs";
import { CosmosMassiveProgressAdapter } from "../massive-progress";

const jobId = massiveJobIDSchema.parse("01ARZ3NDEKTSV4RRFFQ69G5FAV");

const cosmosClient = new CosmosClient({
  endpoint: "https://localhost",
});
const database = cosmosClient.database("test-database");
const container = database.container("test-container");
const adapter = new CosmosMassiveProgressAdapter(container);

describe("CosmosMassiveProgressAdapter", () => {
  it("should return parsed massive progress entries on success", async () => {
    const resource = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      jobId,
      scheduledTimestamp: 1700000100,
      status: "SENT",
      tags: ["aaa"],
    };

    const fetchAll = vi.fn().mockResolvedValueOnce({
      resources: [resource],
    });
    const querySpy = vi
      .spyOn(container.items, "query")
      .mockReturnValueOnce({ fetchAll } as never);

    const result = await adapter.listMassiveJobProgress(jobId);

    expect(result).toEqual([resource]);

    expect(querySpy).toHaveBeenCalledWith(
      {
        parameters: [{ name: "@partitionKey", value: jobId }],
        query: "SELECT * FROM c WHERE c.jobId = @partitionKey",
      } as SqlQuerySpec,
      { partitionKey: jobId },
    );
  });

  it("should return ErrorInternal when a progress document is invalid", async () => {
    const fetchAll = vi.fn().mockResolvedValueOnce({
      resources: [
        {
          completed: false,
          id: "not-a-uuid",
          jobId,
          scheduledTimestamp: 1700000100,
          tags: ["aaa"],
        },
      ],
    });
    vi.spyOn(container.items, "query").mockReturnValueOnce({
      fetchAll,
    } as never);

    const result = await adapter.listMassiveJobProgress(jobId);

    expect(result).toBeInstanceOf(ErrorInternal);
    expect((result as ErrorInternal).message).toBe(
      "Invalid Massive Progress obtained from cosmos",
    );
  });

  it("should return ErrorInternal when cosmos query fails", async () => {
    vi.spyOn(container.items, "query").mockImplementationOnce(() => {
      throw new Error("cosmos failure");
    });

    const result = await adapter.listMassiveJobProgress(jobId);

    expect(result).toBeInstanceOf(ErrorInternal);
    expect((result as ErrorInternal).message).toBe(
      "Failed to list massive job progress",
    );
  });

  it("should query pending progress using the PENDING status filter", async () => {
    const resource = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      jobId,
      scheduledTimestamp: 1700000100,
      status: "PENDING",
      tags: ["aaa"],
    };

    const fetchAll = vi.fn().mockResolvedValueOnce({
      resources: [resource],
    });
    const querySpy = vi
      .spyOn(container.items, "query")
      .mockReturnValueOnce({ fetchAll } as never);

    const result = await adapter.listMassiveJobPendingProgress(jobId);

    expect(result).toEqual([resource]);
    expect(querySpy).toHaveBeenCalledWith(
      {
        parameters: [
          { name: "@partitionKey", value: jobId },
          { name: "@status", value: "PENDING" },
        ],
        query:
          "SELECT * FROM c WHERE c.jobId = @partitionKey and c.status = @status",
      } as SqlQuerySpec,
      { partitionKey: jobId },
    );
  });

  it("should return the activity id when setStatus succeeds", async () => {
    const patch = vi.fn().mockResolvedValueOnce({
      activityId: "activity-id",
    });
    vi.spyOn(container, "item").mockReturnValueOnce({ patch } as never);

    const result = await adapter.setStatus(
      "550e8400-e29b-41d4-a716-446655440000",
      jobId,
      "FAILED",
    );

    expect(result).toBe("activity-id");
    expect(container.item).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440000",
      jobId,
    );
    expect(patch).toHaveBeenCalledWith({
      operations: [{ op: "set", path: "/status", value: "FAILED" }],
    });
  });

  it("should return ErrorNotFound when setStatus receives a 404 response", async () => {
    const restError = new RestError("not found");
    restError.statusCode = 404;
    const patch = vi.fn().mockRejectedValueOnce(restError);
    vi.spyOn(container, "item").mockReturnValueOnce({ patch } as never);

    const result = await adapter.setStatus(
      "550e8400-e29b-41d4-a716-446655440000",
      jobId,
      "FAILED",
    );

    expect(result).toBeInstanceOf(ErrorNotFound);
  });

  it("should return ErrorTooManyRequests when setStatus receives a 429 response", async () => {
    const restError = new RestError("too many requests");
    restError.statusCode = 429;
    const patch = vi.fn().mockRejectedValueOnce(restError);
    vi.spyOn(container, "item").mockReturnValueOnce({ patch } as never);

    const result = await adapter.setStatus(
      "550e8400-e29b-41d4-a716-446655440000",
      jobId,
      "FAILED",
    );

    expect(result).toBeInstanceOf(ErrorTooManyRequests);
  });
});
