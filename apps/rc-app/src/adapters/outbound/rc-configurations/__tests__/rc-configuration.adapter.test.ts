import { CosmosClient, RestError } from "@azure/cosmos";
import { GenericError, TooManyRequestsError } from "@pagopa/hexagonal-core";
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
  const mockCosmosClient = {
    database: vi.fn().mockReturnValue({
      container: vi.fn().mockReturnValue({
        items: { query: mockQuery },
      }),
    }),
  } as unknown as CosmosClient;

  return { mockCosmosClient, mockFetchNext, mockQuery };
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

    it("returns a GenericError when no resources are found", async () => {
      const { mockCosmosClient, mockFetchNext } = makeMocks();
      mockFetchNext.mockResolvedValueOnce({ resources: [] });

      const adapter = new RCConfigurationCosmosAdapter(
        mockCosmosClient,
        "myDatabase",
      );
      const result =
        await adapter.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
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
