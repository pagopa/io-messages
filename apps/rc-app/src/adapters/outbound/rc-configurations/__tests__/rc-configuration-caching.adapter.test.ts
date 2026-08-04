import {
  ConflictError,
  GenericError,
  NotFoundError,
} from "@pagopa/hexagonal-core";
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

const cacheTTLInSeconds = 60;

const makeMocks = () => {
  const mockGetFromRepo = vi.fn();
  const mockCreateInRepo = vi.fn();
  const mockUpdateInRepo = vi.fn();
  const mockGetFromCache = vi.fn();
  const mockSetInCache = vi.fn();

  const repository: RemoteContentRepository = {
    createRemoteContentConfiguration: mockCreateInRepo,
    getRemoteContentConfiguration: mockGetFromRepo,
    updateRemoteContentConfiguration: mockUpdateInRepo,
  };

  const cache: RemoteContentCacheRepository = {
    getCachedRemoteContentConfiguration: mockGetFromCache,
    setCachedRemoteContentConfiguration: mockSetInCache,
  };

  return {
    cache,
    mockCreateInRepo,
    mockGetFromCache,
    mockGetFromRepo,
    mockSetInCache,
    mockUpdateInRepo,
    repository,
  };
};

describe("CachingRemoteContentRepository", () => {
  describe("getRemoteContentConfiguration", () => {
    it("returns the cached value without calling the repository on a cache hit", async () => {
      const { cache, mockGetFromCache, mockGetFromRepo, repository } =
        makeMocks();
      mockGetFromCache.mockResolvedValueOnce(ok(aValidConfiguration));

      const sut = new CachingRemoteContentRepository(
        repository,
        cache,
        cacheTTLInSeconds,
      );
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

      const sut = new CachingRemoteContentRepository(
        repository,
        cache,
        cacheTTLInSeconds,
      );
      const result = await sut.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({
        configurationId: aConfigurationId,
      });
      expect(mockGetFromRepo).toHaveBeenCalledWith(aConfigurationId);
      expect(mockSetInCache).toHaveBeenCalledWith(
        aConfigurationId,
        aValidConfiguration,
        cacheTTLInSeconds,
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

      const sut = new CachingRemoteContentRepository(
        repository,
        cache,
        cacheTTLInSeconds,
      );
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

      const sut = new CachingRemoteContentRepository(
        repository,
        cache,
        cacheTTLInSeconds,
      );
      const result = await sut.getRemoteContentConfiguration(aConfigurationId);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({
        configurationId: aConfigurationId,
      });
    });
  });

  describe("createRemoteContentConfiguration", () => {
    it("delegates to the repository and stores the created configuration in cache", async () => {
      const { cache, mockCreateInRepo, mockSetInCache, repository } =
        makeMocks();
      mockCreateInRepo.mockResolvedValueOnce(ok(aValidConfiguration));
      mockSetInCache.mockResolvedValueOnce(ok(aValidConfiguration));

      const sut = new CachingRemoteContentRepository(
        repository,
        cache,
        cacheTTLInSeconds,
      );
      const result =
        await sut.createRemoteContentConfiguration(aValidConfiguration);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({
        configurationId: aConfigurationId,
      });
      expect(mockCreateInRepo).toHaveBeenCalledWith(aValidConfiguration);
      expect(mockSetInCache).toHaveBeenCalledWith(
        aConfigurationId,
        aValidConfiguration,
        cacheTTLInSeconds,
      );
    });

    it("returns the repository error without touching the cache", async () => {
      const { cache, mockCreateInRepo, mockSetInCache, repository } =
        makeMocks();
      mockCreateInRepo.mockResolvedValueOnce(
        err(new ConflictError("already exists")),
      );

      const sut = new CachingRemoteContentRepository(
        repository,
        cache,
        cacheTTLInSeconds,
      );
      const result =
        await sut.createRemoteContentConfiguration(aValidConfiguration);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ConflictError);
      expect(mockSetInCache).not.toHaveBeenCalled();
    });

    it("returns the created configuration even when storing in cache fails", async () => {
      const { cache, mockCreateInRepo, mockSetInCache, repository } =
        makeMocks();
      mockCreateInRepo.mockResolvedValueOnce(ok(aValidConfiguration));
      mockSetInCache.mockResolvedValueOnce(
        err(new GenericError("redis write failed")),
      );

      const sut = new CachingRemoteContentRepository(
        repository,
        cache,
        cacheTTLInSeconds,
      );
      const result =
        await sut.createRemoteContentConfiguration(aValidConfiguration);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({
        configurationId: aConfigurationId,
      });
    });
  });
});

describe("CachingRemoteContentRepository.updateRemoteContentConfiguration", () => {
  it("delegates to the repository and refreshes the cached configuration", async () => {
    const { cache, mockSetInCache, mockUpdateInRepo, repository } = makeMocks();
    mockUpdateInRepo.mockResolvedValueOnce(ok(aValidConfiguration));
    mockSetInCache.mockResolvedValueOnce(ok(aValidConfiguration));

    const sut = new CachingRemoteContentRepository(
      repository,
      cache,
      cacheTTLInSeconds,
    );
    const result =
      await sut.updateRemoteContentConfiguration(aValidConfiguration);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toMatchObject({
      configurationId: aConfigurationId,
    });
    expect(mockUpdateInRepo).toHaveBeenCalledWith(aValidConfiguration);
    expect(mockSetInCache).toHaveBeenCalledWith(
      aConfigurationId,
      aValidConfiguration,
      cacheTTLInSeconds,
    );
  });

  it("returns the repository error without touching the cache", async () => {
    const { cache, mockSetInCache, mockUpdateInRepo, repository } = makeMocks();
    mockUpdateInRepo.mockResolvedValueOnce(
      err(new NotFoundError("rc-configuration", "not found")),
    );

    const sut = new CachingRemoteContentRepository(
      repository,
      cache,
      cacheTTLInSeconds,
    );
    const result =
      await sut.updateRemoteContentConfiguration(aValidConfiguration);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    expect(mockSetInCache).not.toHaveBeenCalled();
  });

  it("returns the updated configuration even when storing in cache fails", async () => {
    const { cache, mockSetInCache, mockUpdateInRepo, repository } = makeMocks();
    mockUpdateInRepo.mockResolvedValueOnce(ok(aValidConfiguration));
    mockSetInCache.mockResolvedValueOnce(
      err(new GenericError("redis write failed")),
    );

    const sut = new CachingRemoteContentRepository(
      repository,
      cache,
      cacheTTLInSeconds,
    );
    const result =
      await sut.updateRemoteContentConfiguration(aValidConfiguration);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toMatchObject({
      configurationId: aConfigurationId,
    });
  });
});
