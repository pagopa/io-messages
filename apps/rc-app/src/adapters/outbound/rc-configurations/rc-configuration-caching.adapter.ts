import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import {
  ConflictError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { Result, err, ok } from "neverthrow";

import {
  RCConfiguration,
  RcConfigurationId,
  RemoteContentRepository,
} from "../../../application/ports/rc-configuration.js";
import { RemoteContentCacheRepository } from "../../../application/ports/rc-configuration-cache.js";

export class CachingRemoteContentRepository implements RemoteContentRepository {
  constructor(
    private readonly repository: RemoteContentRepository,
    private readonly cache: RemoteContentCacheRepository,
    private readonly cacheTtlInSeconds: number,
    private readonly logger?: Logger,
  ) {}

  private async setCachedAfterCommit(
    operation: "create" | "update",
    stage: "after_create_commit" | "after_update_commit",
    configurationId: RcConfigurationId,
    configuration: RCConfiguration,
  ): Promise<void> {
    const result = await this.cache.setCachedRemoteContentConfiguration(
      configurationId,
      configuration,
      this.cacheTtlInSeconds,
    );
    if (result.isErr()) {
      this.logger?.trackEvent({
        name: "CachingRemoteContentRepository.cache.set.failed",
        properties: {
          failureType: "cache_write_failure",
          operation,
          stage,
        },
      });
    }
  }

  async createRemoteContentConfiguration(
    configuration: RCConfiguration,
  ): Promise<
    Result<RCConfiguration, ConflictError | GenericError | TooManyRequestsError>
  > {
    const result =
      await this.repository.createRemoteContentConfiguration(configuration);
    if (result.isErr()) {
      return err(result.error);
    }

    await this.setCachedAfterCommit(
      "create",
      "after_create_commit",
      result.value.configurationId,
      result.value,
    );

    return ok(result.value);
  }

  async getRemoteContentConfiguration(
    configurationId: RcConfigurationId,
  ): Promise<
    Result<RCConfiguration, GenericError | NotFoundError | TooManyRequestsError>
  > {
    const cached =
      await this.cache.getCachedRemoteContentConfiguration(configurationId);
    if (cached.isOk()) {
      return ok(cached.value);
    }

    const result =
      await this.repository.getRemoteContentConfiguration(configurationId);
    if (!(cached.error instanceof NotFoundError)) {
      this.logger?.trackEvent({
        name: "CachingRemoteContentRepository.cache.get.failed",
        properties: {
          failureType:
            cached.error instanceof GenericError
              ? "cache_read_failure"
              : "malformed_cache_entry",
          fallback: "cosmos",
          fallbackOutcome: result.isOk()
            ? "success"
            : result.error instanceof NotFoundError
              ? "not_found"
              : result.error instanceof TooManyRequestsError
                ? "rate_limited"
                : "failure",
          operation: "get",
          stage: "cache_read",
        },
      });
    }
    if (result.isErr()) {
      return err(result.error);
    }

    await this.cache.setCachedRemoteContentConfiguration(
      configurationId,
      result.value,
      this.cacheTtlInSeconds,
    );

    return ok(result.value);
  }

  async listRemoteContentConfigurations(
    configurationIds: RcConfigurationId[],
  ): Promise<Result<RCConfiguration[], GenericError | TooManyRequestsError>> {
    return this.repository.listRemoteContentConfigurations(configurationIds);
  }

  async updateRemoteContentConfiguration(
    configuration: RCConfiguration,
  ): Promise<
    Result<RCConfiguration, GenericError | NotFoundError | TooManyRequestsError>
  > {
    const result =
      await this.repository.updateRemoteContentConfiguration(configuration);
    if (result.isErr()) {
      return err(result.error);
    }

    await this.setCachedAfterCommit(
      "update",
      "after_update_commit",
      result.value.configurationId,
      result.value,
    );

    return ok(result.value);
  }
}
