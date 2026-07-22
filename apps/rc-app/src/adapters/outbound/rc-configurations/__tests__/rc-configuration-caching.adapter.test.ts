import { GenericError, NotFoundError } from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { RemoteContentRepository } from "../../../../application/ports/rc-configuration.js";
import type { RemoteContentCacheRepository } from "../../../../application/ports/rc-configuration-cache.js";

import { MalformedEntityError } from "../../../../application/ports/error.js";
import { CachingRemoteContentRepository } from "../rc-configuration-caching.adapter.js";

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
  const mockGetFromRepo = vi.fn();
  const mockGetFromCache = vi.fn();
  const mockSetInCache = vi.fn();

  const repository: RemoteContentRepository = {
    getRemoteContentConfiguration: mockGetFromRepo,
  };

  const cache: RemoteContentCacheRepository = {
    getCachedRemoteContentConfiguration: mockGetFromCache,
    setCachedRemoteContentConfiguration: mockSetInCache,
  };

  return {
    cache,
    mockGetFromCache,
    mockGetFromRepo,
    mockSetInCache,
    repository,
  };
};

describe("CachingRemoteContentRepository", () => {
  describe("getRemoteContentConfiguration", () => {
    it("returns the cached value without calling the repository on a cache hit", async () => {
      const { cache, mockGetFromCache, mockGetFromRepo, repository } =
        makeMocks();
      mockGetFromCache.mockResolvedValueOnce(ok(aValidConfiguration));

      const sut = new CachingRemoteContentRepository(repository, cache);
      const result = await sut.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({
        configurationId: aConfigurationId,
      });
      expect(mockGetFromRepo).not.toHaveBeenCalled();
    });

    it("calls the repository on a cache miss and stores the result in cache", async () => {
      const {
        cache,
        mockGetFromCache,
        mockGetFromRepo,
        mockSetInCache,
        repository,
      } = makeMocks();
      mockGetFromCache.mockResolvedValueOnce(
        err(new NotFoundError("rc-configuration", "not found")),
      );
      mockGetFromRepo.mockResolvedValueOnce(ok(aValidConfiguration));
      mockSetInCache.mockResolvedValueOnce(ok(aValidConfiguration));

      const sut = new CachingRemoteContentRepository(repository, cache);
      const result = await sut.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({
        configurationId: aConfigurationId,
      });
      expect(mockGetFromRepo).toHaveBeenCalledWith(aConfigurationId);
      expect(mockSetInCache).toHaveBeenCalledWith(
        aConfigurationId,
        aValidConfiguration,
      );
    });

    it("returns the repository error on a cache miss when the repository fails", async () => {
      const {
        cache,
        mockGetFromCache,
        mockGetFromRepo,
        mockSetInCache,
        repository,
      } = makeMocks();
      mockGetFromCache.mockResolvedValueOnce(
        err(new NotFoundError("rc-configuration", "not found")),
      );
      mockGetFromRepo.mockResolvedValueOnce(
        err(new GenericError("cosmos unavailable")),
      );

      const sut = new CachingRemoteContentRepository(repository, cache);
      const result = await sut.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
      expect(mockSetInCache).not.toHaveBeenCalled();
    });

    it("returns the value even when storing in cache fails", async () => {
      const {
        cache,
        mockGetFromCache,
        mockGetFromRepo,
        mockSetInCache,
        repository,
      } = makeMocks();
      mockGetFromCache.mockResolvedValueOnce(
        err(new MalformedEntityError("malformed")),
      );
      mockGetFromRepo.mockResolvedValueOnce(ok(aValidConfiguration));
      mockSetInCache.mockResolvedValueOnce(
        err(new GenericError("redis write failed")),
      );

      const sut = new CachingRemoteContentRepository(repository, cache);
      const result = await sut.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({
        configurationId: aConfigurationId,
      });
    });
  });
});
