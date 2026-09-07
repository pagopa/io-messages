import { CosmosClient, ErrorResponse, RestError } from "@azure/cosmos";
import { GenericError, TooManyRequestsError } from "@pagopa/hexagonal-core";
import { describe, expect, it, vi } from "vitest";

import { UserRCConfigurationCosmosAdapter } from "../user-rc-configuration.adapter.js";

const aUserId = "user-123";
const aConfigurationId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

const aValidUserRCConfiguration = {
  id: aConfigurationId,
  userId: aUserId,
};

const makeCosmosError = (code: number | string, message = "cosmos failure") => {
  const error = new ErrorResponse(message);
  error.code = code;
  return error;
};

const makeMocks = () => {
  const mockFetchAll = vi.fn();
  const mockQuery = vi.fn().mockReturnValue({ fetchAll: mockFetchAll });
  const mockCosmosClient = {
    database: vi.fn().mockReturnValue({
      container: vi.fn().mockReturnValue({
        items: { query: mockQuery },
      }),
    }),
  } as unknown as CosmosClient;

  return {
    mockCosmosClient,
    mockFetchAll,
    mockQuery,
  };
};

describe("UserRCConfigurationCosmosAdapter.listUserRCConfigurations", () => {
  it("returns the user RC configurations matching the provided user ID", async () => {
    const { mockCosmosClient, mockFetchAll, mockQuery } = makeMocks();
    mockFetchAll.mockResolvedValueOnce({
      resources: [
        {
          ...aValidUserRCConfiguration,
          _etag: '"00000000-0000-0000-0000-000000000000"',
          _rid: "aRid",
          _self: "aSelfLink",
          _ts: 1700000000,
        },
      ],
    });

    const adapter = new UserRCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result = await adapter.listUserRCConfigurations(aUserId);

    expect(mockQuery).toHaveBeenCalledWith({
      parameters: [{ name: "@userId", value: aUserId }],
      query: "SELECT * FROM n WHERE n.userId = @userId",
    });
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toStrictEqual([aValidUserRCConfiguration]);
  });

  it("returns a TooManyRequestsError when Cosmos responds with 429", async () => {
    const { mockCosmosClient, mockFetchAll } = makeMocks();
    mockFetchAll.mockRejectedValueOnce(makeCosmosError(429));

    const adapter = new UserRCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result = await adapter.listUserRCConfigurations(aUserId);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
  });

  it("returns a TooManyRequestsError when the transport layer reports 429", async () => {
    const { mockCosmosClient, mockFetchAll } = makeMocks();
    mockFetchAll.mockRejectedValueOnce(
      new RestError("Too Many Requests", { statusCode: 429 }),
    );

    const adapter = new UserRCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result = await adapter.listUserRCConfigurations(aUserId);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
  });

  it("returns a GenericError when Cosmos responds with another status code", async () => {
    const { mockCosmosClient, mockFetchAll } = makeMocks();
    mockFetchAll.mockRejectedValueOnce(makeCosmosError(500));

    const adapter = new UserRCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result = await adapter.listUserRCConfigurations(aUserId);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("returns a GenericError when one resource does not match the schema", async () => {
    const { mockCosmosClient, mockFetchAll } = makeMocks();
    mockFetchAll.mockResolvedValueOnce({
      resources: [aValidUserRCConfiguration, { invalid: "data" }],
    });

    const adapter = new UserRCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result = await adapter.listUserRCConfigurations(aUserId);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
