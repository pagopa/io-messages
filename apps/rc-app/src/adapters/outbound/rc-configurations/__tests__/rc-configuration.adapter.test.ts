import { CosmosClient, RestError } from "@azure/cosmos";
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

const makeMocks = () => {
  const mockFetchNext = vi.fn();
  const mockQuery = vi.fn().mockReturnValue({ fetchNext: mockFetchNext });
  const mockCreate = vi.fn();
  const mockCosmosClient = {
    database: vi.fn().mockReturnValue({
      container: vi.fn().mockReturnValue({
        items: { create: mockCreate, query: mockQuery },
      }),
    }),
  } as unknown as CosmosClient;

  return { mockCosmosClient, mockCreate, mockFetchNext, mockQuery };
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

    it("returns a GenericError when Cosmos responds with a non-429 RestError", async () => {
      const { mockCosmosClient, mockFetchNext } = makeMocks();
      mockFetchNext.mockRejectedValueOnce(
        new RestError("Internal Server Error", { statusCode: 500 }),
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

    it("returns a GenericError when a non-RestError is thrown", async () => {
      const { mockCosmosClient, mockFetchNext } = makeMocks();
      mockFetchNext.mockRejectedValueOnce(new Error("network failure"));

      const adapter = new RCConfigurationCosmosAdapter(
        mockCosmosClient,
        "myDatabase",
      );
      const result =
        await adapter.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
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

  it("returns a TooManyRequestsError when Cosmos responds with 429", async () => {
    const { mockCosmosClient, mockCreate } = makeMocks();
    mockCreate.mockRejectedValueOnce(
      new RestError("Too Many Requests", { statusCode: 429 }),
    );

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.createRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
  });

  it("returns a GenericError when Cosmos responds with another RestError", async () => {
    const { mockCosmosClient, mockCreate } = makeMocks();
    mockCreate.mockRejectedValueOnce(
      new RestError("Internal Server Error", { statusCode: 500 }),
    );

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.createRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("returns a GenericError when a non-RestError is thrown", async () => {
    const { mockCosmosClient, mockCreate } = makeMocks();
    mockCreate.mockRejectedValueOnce(new Error("network failure"));

    const adapter = new RCConfigurationCosmosAdapter(
      mockCosmosClient,
      "myDatabase",
    );
    const result =
      await adapter.createRemoteContentConfiguration(aValidCosmosResource);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
