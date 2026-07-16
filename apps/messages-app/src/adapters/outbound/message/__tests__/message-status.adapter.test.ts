import {
  CosmosClient,
  CosmosDiagnostics,
  FeedResponse,
  RestError,
  SqlQuerySpec,
} from "@azure/cosmos";
import { GenericError, TooManyRequestsError } from "@pagopa/hexagonal-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MessageStatus } from "../../../../application/ports/message-status.js";
import { MessageStatusCosmosAdapter } from "../message-status.adapter.js";

const aMessageStatus: MessageStatus = {
  isArchived: false,
  isRead: false,
  messageId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  status: "PROCESSED",
  updatedAt: "2023-01-01T00:00:00.000Z",
  version: 0,
};

const feedResponseWith = (resources: MessageStatus[]) =>
  new FeedResponse<MessageStatus>(
    resources,
    {},
    false,
    new CosmosDiagnostics(),
  );

const cosmosClient = new CosmosClient({
  endpoint: "https://fake.documents.azure.com:443/",
  key: "Zm9v",
});
const database = cosmosClient.database("db");
const container = database.container("message-status");
const queryIterator = container.items.query<MessageStatus>({
  query: "SELECT * FROM c",
});

vi.spyOn(cosmosClient, "database").mockReturnValue(database);
vi.spyOn(database, "container").mockReturnValue(container);
const queryMock = vi
  .spyOn(container.items, "query")
  .mockReturnValue(queryIterator);
const fetchNextMock = vi.spyOn(queryIterator, "fetchNext");

const adapter = new MessageStatusCosmosAdapter(
  cosmosClient,
  "db",
  "message-status",
);

describe("getLatestMessagesStatusByIds", () => {
  beforeEach(() => {
    queryMock.mockClear();
    fetchNextMock.mockReset();
    fetchNextMock.mockResolvedValue(feedResponseWith([aMessageStatus]));
  });

  it("returns the latest status of each message", async () => {
    const result = await adapter.getLatestMessagesStatusByIds([
      aMessageStatus.messageId,
    ]);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([aMessageStatus]);

    const expectedQuery: SqlQuerySpec = {
      parameters: [{ name: "@messageId", value: aMessageStatus.messageId }],
      query:
        "SELECT * FROM c WHERE c.messageId = @messageId ORDER BY c.version DESC OFFSET 0 LIMIT 1",
    };
    expect(queryMock).toHaveBeenCalledWith(expectedQuery, {
      partitionKey: aMessageStatus.messageId,
    });
  });

  it("ignores messages whose status is missing", async () => {
    fetchNextMock.mockResolvedValue(feedResponseWith([]));

    const result = await adapter.getLatestMessagesStatusByIds(["missing"]);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([]);
  });

  it("ignores messages whose status does not match the adapter schema", async () => {
    const aMalformedStatus = { ...aMessageStatus, messageId: "" };
    fetchNextMock.mockResolvedValue(feedResponseWith([aMalformedStatus]));

    const result = await adapter.getLatestMessagesStatusByIds(["malformed"]);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([]);
  });

  it("returns only the valid statuses when some are missing or malformed", async () => {
    const aMalformedStatus = { ...aMessageStatus, messageId: "" };
    fetchNextMock
      .mockResolvedValueOnce(feedResponseWith([aMessageStatus]))
      .mockResolvedValueOnce(feedResponseWith([]))
      .mockResolvedValueOnce(feedResponseWith([aMalformedStatus]));

    const result = await adapter.getLatestMessagesStatusByIds([
      "ok",
      "missing",
      "malformed",
    ]);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([aMessageStatus]);
  });

  it("returns a TooManyRequestsError when Cosmos throttles the request", async () => {
    fetchNextMock.mockRejectedValue(
      new RestError("throttled", { statusCode: 429 }),
    );

    const result = await adapter.getLatestMessagesStatusByIds(["id"]);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
  });

  it("returns a GenericError on an unexpected Cosmos RestError", async () => {
    fetchNextMock.mockRejectedValue(new RestError("boom", { statusCode: 500 }));

    const result = await adapter.getLatestMessagesStatusByIds(["id"]);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("returns a GenericError on a non-RestError failure", async () => {
    fetchNextMock.mockRejectedValue(new Error("unexpected"));

    const result = await adapter.getLatestMessagesStatusByIds(["id"]);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
