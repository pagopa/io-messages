import { CosmosClient, ErrorResponse, RestError } from "@azure/cosmos";
import {
  ConflictError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { describe, expect, it, vi } from "vitest";

import { RCConfigurationCosmosAdapter } from "../rc-configuration.adapter.js";

const aConfigurationId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

const aValidCosmosResource = {
  configurationId: aConfigurationId,
  description: "A description",
  disableLollipopFor: [],
  hasPrecondition: "ALWAYS" as const,
  id: "some-id",
  isLollipopEnabled: false,
  name: "A name",
  userId: "user-123",
};

const makeCosmosError = (code: number | string, message = "cosmos failure") => {
  const error = new ErrorResponse(message);
  error.code = code;
  return error;
};

const makeMocks = () => {
  const mockFetchNext = vi.fn();
  const mockQuery = vi.fn().mockReturnValue({ fetchNext: mockFetchNext });
  const mockCreate = vi.fn();
  const mockReplace = vi.fn();
  const mockItem = vi.fn().mockReturnValue({ replace: mockReplace });
  const mockCosmosClient = {
    database: vi.fn().mockReturnValue({
      container: vi.fn().mockReturnValue({
        item: mockItem,
        items: { create: mockCreate, query: mockQuery },
      }),
    }),
  } as unknown as CosmosClient;

  return {
    mockCosmosClient,
    mockCreate,
    mockFetchNext,
    mockItem,
    mockQuery,
    mockReplace,
  };
};

describe("RCConfigurationCosmosAdapter", () => {
  describe("getRemoteContentConfiguration", () => {
    it("returns the RC configuration when the query returns a valid resource", async () => {
      const { mockCosmosClient, mockFetchNext } = makeMocks();
      mockFetchNext.mockResolvedValueOnce({
        resources: [aValidCosmosResource],
      });

      const adapter = new RCConfigurationCosmosAdapter(
        mockCosmosClient,
        "myDatabase",
      );
      const result =
        await adapter.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({
        configurationId: aConfigurationId,
        name: "A name",
      });
    });

    it("returns a NotFoundError when no resources are found", async () => {
      const { mockCosmosClient, mockFetchNext } = makeMocks();
      mockFetchNext.mockResolvedValueOnce({ resources: [] });

      const adapter = new RCConfigurationCosmosAdapter(
        mockCosmosClient,
        "myDatabase",
      );
      const result =
        await adapter.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    });

    it("returns a TooManyRequestsError when Cosmos responds with 429", async () => {
      const { mockCosmosClient, mockFetchNext } = makeMocks();
      mockFetchNext.mockRejectedValueOnce(makeCosmosError(429));

      const adapter = new RCConfigurationCosmosAdapter(
        mockCosmosClient,
        "myDatabase",
      );
      const result =
        await adapter.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
    });

    it("returns a GenericError when Cosmos responds with another status code", async () => {
      const { mockCosmosClient, mockFetchNext } = makeMocks();
      mockFetchNext.mockRejectedValueOnce(makeCosmosError(500));

      const adapter = new RCConfigurationCosmosAdapter(
        mockCosmosClient,
        "myDatabase",
      );
      const result =
        await adapter.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    });

    it("returns a TooManyRequestsError when the transport layer reports 429", async () => {
      const { mockCosmosClient, mockFetchNext } = makeMocks();
      mockFetchNext.mockRejectedValueOnce(
        new RestError("Too Many Requests", { statusCode: 429 }),
      );

      const adapter = new RCConfigurationCosmosAdapter(
        mockCosmosClient,
        "myDatabase",
      );
      const result =
        await adapter.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
    });

    it("returns a GenericError when the transport layer fails without a status code", async () => {
      const { mockCosmosClient, mockFetchNext } = makeMocks();
      mockFetchNext.mockRejectedValueOnce(
        new RestError("getaddrinfo ENOTFOUND", { code: "ENOTFOUND" }),
      );

      const adapter = new RCConfigurationCosmosAdapter(
        mockCosmosClient,
        "myDatabase",
      );
      const result =
        await adapter.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    });

    it("returns a GenericError when the thrown value is not a Cosmos error", async () => {
      const { mockCosmosClient, mockFetchNext } = makeMocks();
      mockFetchNext.mockRejectedValueOnce("network failure");

      const adapter = new RCConfigurationCosmosAdapter(
        mockCosmosClient,
        "myDatabase",
      );
      const result =
        await adapter.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
      expect(result._unsafeUnwrapErr().message).toContain("network failure");
    });

    it("returns a GenericError when the resource does not match the schema", async () => {
      const { mockCosmosClient, mockFetchNext } = makeMocks();
      mockFetchNext.mockResolvedValueOnce({
        resources: [{ invalid: "data" }],
      });

      const adapter = new RCConfigurationCosmosAdapter(
        mockCosmosClient,
        "myDatabase",
      );
      const result =
        await adapter.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    });
  });
});

describe("RCConfigurationCosmosAdapter.createRemoteContentConfiguration", () => {
  it("returns the created RC configuration when Cosmos accepts the document", async () => {
    const { mockCosmosClient, mockCreate } = makeMocks();
    mockCreate.mockResolvedValueOnce({ resource: aValidCosmosResource });

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.createRemoteContentConfiguration(aValidCosmosResource);

    expect(mockCreate).toHaveBeenCalledWith(aValidCosmosResource);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toStrictEqual(aValidCosmosResource);
  });

  it("persists and returns the optional environments of the RC configuration", async () => {
    const { mockCosmosClient, mockCreate } = makeMocks();
    const anEnvironment = {
      baseUrl: "https://example.com",
      detailsAuthentication: {
        headerKeyName: "X-Api-Key",
        key: "a-key",
        type: "API_KEY",
      },
    };
    const aConfigurationWithEnvironments = {
      ...aValidCosmosResource,
      prodEnvironment: anEnvironment,
      testEnvironment: { ...anEnvironment, testUsers: [] },
    };
    mockCreate.mockResolvedValueOnce({
      resource: aConfigurationWithEnvironments,
    });

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result = await adapter.createRemoteContentConfiguration(
      aConfigurationWithEnvironments,
    );

    expect(mockCreate).toHaveBeenCalledWith(aConfigurationWithEnvironments);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toStrictEqual(
      aConfigurationWithEnvironments,
    );
  });

  it("returns a ConflictError when Cosmos responds with 409", async () => {
    const { mockCosmosClient, mockCreate } = makeMocks();
    mockCreate.mockRejectedValueOnce(makeCosmosError(409));

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.createRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ConflictError);
  });

  it("returns a TooManyRequestsError when Cosmos responds with 429", async () => {
    const { mockCosmosClient, mockCreate } = makeMocks();
    mockCreate.mockRejectedValueOnce(makeCosmosError(429));

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.createRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
  });

  it("returns a GenericError when Cosmos responds with another status code", async () => {
    const { mockCosmosClient, mockCreate } = makeMocks();
    mockCreate.mockRejectedValueOnce(makeCosmosError(500));

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.createRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("returns a GenericError when the status code is not numeric", async () => {
    const { mockCosmosClient, mockCreate } = makeMocks();
    mockCreate.mockRejectedValueOnce(makeCosmosError("ENOTFOUND"));

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.createRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("returns a ConflictError when the transport layer reports 409", async () => {
    const { mockCosmosClient, mockCreate } = makeMocks();
    mockCreate.mockRejectedValueOnce(
      new RestError("Conflict", { statusCode: 409 }),
    );

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.createRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ConflictError);
  });

  it("returns a GenericError when the thrown value is not a Cosmos error", async () => {
    const { mockCosmosClient, mockCreate } = makeMocks();
    mockCreate.mockRejectedValueOnce("network failure");

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.createRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toContain("network failure");
  });
});

describe("RCConfigurationCosmosAdapter.updateRemoteContentConfiguration", () => {
  it("replaces the document addressing it by id and partition key", async () => {
    const { mockCosmosClient, mockItem, mockReplace } = makeMocks();
    mockReplace.mockResolvedValueOnce({ resource: aValidCosmosResource });

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.updateRemoteContentConfiguration(aValidCosmosResource);

    expect(mockItem).toHaveBeenCalledWith(
      aValidCosmosResource.id,
      aConfigurationId,
    );
    expect(mockReplace).toHaveBeenCalledWith(aValidCosmosResource);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toStrictEqual(aValidCosmosResource);
  });

  it("persists and returns the optional environments of the RC configuration", async () => {
    const { mockCosmosClient, mockReplace } = makeMocks();
    const anEnvironment = {
      baseUrl: "https://example.com",
      detailsAuthentication: {
        headerKeyName: "X-Api-Key",
        key: "a-key",
        type: "API_KEY",
      },
    };
    const aConfigurationWithEnvironments = {
      ...aValidCosmosResource,
      prodEnvironment: anEnvironment,
      testEnvironment: { ...anEnvironment, testUsers: [] },
    };
    mockReplace.mockResolvedValueOnce({
      resource: aConfigurationWithEnvironments,
    });

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result = await adapter.updateRemoteContentConfiguration(
      aConfigurationWithEnvironments,
    );

    expect(mockReplace).toHaveBeenCalledWith(aConfigurationWithEnvironments);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toStrictEqual(
      aConfigurationWithEnvironments,
    );
  });

  it("returns a NotFoundError when Cosmos responds with 404", async () => {
    const { mockCosmosClient, mockReplace } = makeMocks();
    mockReplace.mockRejectedValueOnce(makeCosmosError(404));

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.updateRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    expect(result._unsafeUnwrapErr().message).toContain(aConfigurationId);
  });

  it("returns a TooManyRequestsError when Cosmos responds with 429", async () => {
    const { mockCosmosClient, mockReplace } = makeMocks();
    mockReplace.mockRejectedValueOnce(makeCosmosError(429));

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.updateRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
  });

  it("returns a GenericError when Cosmos responds with another status code", async () => {
    const { mockCosmosClient, mockReplace } = makeMocks();
    mockReplace.mockRejectedValueOnce(makeCosmosError(500));

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.updateRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toContain(aConfigurationId);
  });

  it("returns a GenericError when the status code is not numeric", async () => {
    const { mockCosmosClient, mockReplace } = makeMocks();
    mockReplace.mockRejectedValueOnce(makeCosmosError("ENOTFOUND"));

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.updateRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("returns a NotFoundError when the transport layer reports 404", async () => {
    const { mockCosmosClient, mockReplace } = makeMocks();
    mockReplace.mockRejectedValueOnce(
      new RestError("Not Found", { statusCode: 404 }),
    );

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.updateRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it("returns a GenericError when the thrown value is not a Cosmos error", async () => {
    const { mockCosmosClient, mockReplace } = makeMocks();
    mockReplace.mockRejectedValueOnce("network failure");

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.updateRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toContain("network failure");
  });
});
