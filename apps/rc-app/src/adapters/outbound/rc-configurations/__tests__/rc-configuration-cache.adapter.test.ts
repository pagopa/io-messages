import type { Logger } from "@pagopa/hexagonal-core/domain/ports";
import type { RedisClientType } from "redis";

import { GenericError, NotFoundError } from "@pagopa/hexagonal-core";
import { describe, expect, it, vi } from "vitest";

import { MalformedEntityError } from "../../../../application/ports/error.js";
import { RCConfigurationCacheAdapter } from "../rc-configuration-cache.adapter.js";

const aConfigurationId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

const aValidConfiguration = {
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
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  const mockRedisClient = {
    get: mockGet,
    set: mockSet,
  } as unknown as RedisClientType;
  const mockLogger = {
    trackEvent: vi.fn(),
  } as unknown as Logger;
  return { mockGet, mockLogger, mockRedisClient, mockSet };
};

describe("RCConfigurationCacheAdapter", () => {
  describe("getCachedRemoteContentConfiguration", () => {
    it("returns the configuration when a valid cached value is found", async () => {
      const { mockGet, mockLogger, mockRedisClient } = makeMocks();
      mockGet.mockResolvedValueOnce(JSON.stringify(aValidConfiguration));

      const adapter = new RCConfigurationCacheAdapter(
        mockRedisClient,
        mockLogger,
      );
      const result =
        await adapter.getCachedRemoteContentConfiguration(aConfigurationId);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({
        configurationId: aConfigurationId,
      });
    });

    it("returns a NotFoundError when the key does not exist in cache", async () => {
      const { mockGet, mockLogger, mockRedisClient } = makeMocks();
      mockGet.mockResolvedValueOnce(null);

      const adapter = new RCConfigurationCacheAdapter(
        mockRedisClient,
        mockLogger,
      );
      const result =
        await adapter.getCachedRemoteContentConfiguration(aConfigurationId);

      expect(mockLogger.trackEvent).not.toHaveBeenCalled();
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    });

    it("returns a MalformedEntityError when the cached value fails schema validation", async () => {
      const { mockGet, mockLogger, mockRedisClient } = makeMocks();
      mockGet.mockResolvedValueOnce(JSON.stringify({ invalid: "data" }));

      const adapter = new RCConfigurationCacheAdapter(
        mockRedisClient,
        mockLogger,
      );
      const result =
        await adapter.getCachedRemoteContentConfiguration(aConfigurationId);

      expect(mockLogger.trackEvent).toHaveBeenCalledOnce();
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
    });

    it("returns a GenericError when Redis throws", async () => {
      const { mockGet, mockLogger, mockRedisClient } = makeMocks();
      mockGet.mockRejectedValueOnce(new Error("connection refused"));

      const adapter = new RCConfigurationCacheAdapter(
        mockRedisClient,
        mockLogger,
      );
      const result =
        await adapter.getCachedRemoteContentConfiguration(aConfigurationId);

      expect(mockLogger.trackEvent).not.toHaveBeenCalled();
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
      expect(result._unsafeUnwrapErr().message).toContain("Redis error");
    });
  });

  describe("setCachedRemoteContentConfiguration", () => {
    it("returns the configuration on successful set", async () => {
      const { mockLogger, mockRedisClient, mockSet } = makeMocks();
      mockSet.mockResolvedValueOnce("OK");

      const adapter = new RCConfigurationCacheAdapter(
        mockRedisClient,
        mockLogger,
      );
      const result = await adapter.setCachedRemoteContentConfiguration(
        aConfigurationId,
        aValidConfiguration,
      );

      expect(mockLogger.trackEvent).not.toHaveBeenCalled();
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(aValidConfiguration);
    });

    it("calls set with EX option when ttlInSeconds is provided", async () => {
      const { mockLogger, mockRedisClient, mockSet } = makeMocks();
      mockSet.mockResolvedValueOnce("OK");

      const adapter = new RCConfigurationCacheAdapter(
        mockRedisClient,
        mockLogger,
      );
      await adapter.setCachedRemoteContentConfiguration(
        aConfigurationId,
        aValidConfiguration,
        3600,
      );

      expect(mockLogger.trackEvent).not.toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { EX: 3600 },
      );
    });

    it("calls set without EX option when ttlInSeconds is not provided", async () => {
      const { mockLogger, mockRedisClient, mockSet } = makeMocks();
      mockSet.mockResolvedValueOnce("OK");

      const adapter = new RCConfigurationCacheAdapter(
        mockRedisClient,
        mockLogger,
      );
      await adapter.setCachedRemoteContentConfiguration(
        aConfigurationId,
        aValidConfiguration,
      );

      expect(mockLogger.trackEvent).not.toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        undefined,
      );
    });

    it("returns a GenericError when Redis throws", async () => {
      const { mockLogger, mockRedisClient, mockSet } = makeMocks();
      mockSet.mockRejectedValueOnce(new Error("write failed"));

      const adapter = new RCConfigurationCacheAdapter(
        mockRedisClient,
        mockLogger,
      );
      const result = await adapter.setCachedRemoteContentConfiguration(
        aConfigurationId,
        aValidConfiguration,
      );

      expect(mockLogger.trackEvent).not.toHaveBeenCalled();
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
      expect(result._unsafeUnwrapErr().message).toContain("Redis error");
    });
  });
});
