import {
  CosmosClient,
  CosmosDiagnostics,
  FeedResponse,
  RestError,
  SqlQuerySpec,
} from "@azure/cosmos";
import {
  FiscalCodeSchema,
  GenericError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { Logger } from "@pagopa/hexagonal-core/domain/ports";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MessageMetadata } from "../../../../application/ports/message-metadata.js";
import { CryptoAdapter } from "../../crypto/crypto.adapter.js";
import { MessageMetadataCosmosAdapter } from "../message-metadata.adapter.js";

const aFiscalCode = FiscalCodeSchema.parse("RSSMRA85M01H501Z");

const aMessageMetadata: MessageMetadata = {
  createdAt: "2023-01-01T00:00:00.000Z",
  featureLevelType: "STANDARD",
  fiscalCode: aFiscalCode,
  id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  indexedId: "01ARZ3NDEKTSV4RRFFQ69G5FAW",
  isPending: false,
  senderServiceId: "service-id",
  senderUserId: "user-id",
  timeToLiveSeconds: 3600,
};

const feedResponseWith = (resources: MessageMetadata[]) =>
  new FeedResponse<MessageMetadata>(
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
const container = database.container("messages");
const queryIterator = container.items.query<MessageMetadata>({
  query: "SELECT * FROM c",
});

vi.spyOn(cosmosClient, "database").mockReturnValue(database);
vi.spyOn(database, "container").mockReturnValue(container);
const queryMock = vi
  .spyOn(container.items, "query")
  .mockReturnValue(queryIterator);
const fetchNextMock = vi.spyOn(queryIterator, "fetchNext");

const trackEventMock = vi.fn();
const adapter = new MessageMetadataCosmosAdapter(
  cosmosClient,
  "db",
  "messages",
  {
    trackEvent: trackEventMock,
  } as unknown as Logger,
  new CryptoAdapter(),
);

describe("getMessagesMetadataByUser", () => {
  beforeEach(() => {
    queryMock.mockClear();
    fetchNextMock.mockReset();
    fetchNextMock.mockResolvedValue(feedResponseWith([aMessageMetadata]));
    trackEventMock.mockReset();
  });

  it("returns the message metadata of the user", async () => {
    const result = await adapter.getMessagesMetadataByUser(aFiscalCode, 10);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([aMessageMetadata]);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("queries the user's non-pending messages ordered by descending id", async () => {
    await adapter.getMessagesMetadataByUser(aFiscalCode, 10);

    const expectedQuery: SqlQuerySpec = {
      parameters: [{ name: "@fiscalCode", value: aFiscalCode }],
      query:
        "SELECT * FROM c WHERE c.fiscalCode = @fiscalCode and c.isPending = false ORDER BY c.id DESC",
    };
    expect(queryMock).toHaveBeenCalledWith(expectedQuery, { maxItemCount: 10 });
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("narrows the query with the maximumID cursor when provided", async () => {
    await adapter.getMessagesMetadataByUser(aFiscalCode, 10, "01MAX");

    const expectedQuery: SqlQuerySpec = {
      parameters: [
        { name: "@fiscalCode", value: aFiscalCode },
        { name: "@maximumId", value: "01MAX" },
      ],
      query:
        "SELECT * FROM c WHERE c.fiscalCode = @fiscalCode and c.isPending = false AND c.id < @maximumId ORDER BY c.id DESC",
    };
    expect(queryMock).toHaveBeenCalledWith(expectedQuery, { maxItemCount: 10 });
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("narrows the query with the minimumID cursor when provided", async () => {
    await adapter.getMessagesMetadataByUser(
      aFiscalCode,
      10,
      undefined,
      "01MIN",
    );

    const expectedQuery: SqlQuerySpec = {
      parameters: [
        { name: "@fiscalCode", value: aFiscalCode },
        { name: "@minimumId", value: "01MIN" },
      ],
      query:
        "SELECT * FROM c WHERE c.fiscalCode = @fiscalCode and c.isPending = false AND c.id > @minimumId ORDER BY c.id DESC",
    };
    expect(queryMock).toHaveBeenCalledWith(expectedQuery, { maxItemCount: 10 });
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("ignores documents that do not match the adapter schema", async () => {
    const aMalformedMetadata = { ...aMessageMetadata, id: "not-a-ulid" };
    fetchNextMock.mockResolvedValue(
      feedResponseWith([aMessageMetadata, aMalformedMetadata]),
    );

    const result = await adapter.getMessagesMetadataByUser(aFiscalCode, 10);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([aMessageMetadata]);
    expect(trackEventMock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty array when the user has no messages", async () => {
    fetchNextMock.mockResolvedValue(feedResponseWith([]));

    const result = await adapter.getMessagesMetadataByUser(aFiscalCode, 10);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([]);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("returns a TooManyRequestsError when Cosmos throttles the request", async () => {
    fetchNextMock.mockRejectedValue(
      new RestError("throttled", { statusCode: 429 }),
    );

    const result = await adapter.getMessagesMetadataByUser(aFiscalCode, 10);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("returns a GenericError on an unexpected Cosmos RestError", async () => {
    fetchNextMock.mockRejectedValue(new RestError("boom", { statusCode: 500 }));

    const result = await adapter.getMessagesMetadataByUser(aFiscalCode, 10);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("returns a GenericError on a non-RestError failure", async () => {
    fetchNextMock.mockRejectedValue(new Error("unexpected"));

    const result = await adapter.getMessagesMetadataByUser(aFiscalCode, 10);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});
