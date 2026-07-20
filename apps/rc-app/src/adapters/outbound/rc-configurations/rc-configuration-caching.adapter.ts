import { GenericError, TooManyRequestsError } from "@pagopa/hexagonal-core";
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
  ) {}

  async getRemoteContentConfiguration(
    configurationId: RcConfigurationId,
  ): Promise<Result<RCConfiguration, GenericError | TooManyRequestsError>> {
    const cached =
      await this.cache.getCachedRemoteContentConfiguration(configurationId);
    if (cached.isOk()) {
      return ok(cached.value);
    }

    const result =
      await this.repository.getRemoteContentConfiguration(configurationId);
    if (result.isErr()) {
      return err(result.error);
    }

    await this.cache.setCachedRemoteContentConfiguration(
      configurationId,
      result.value,
    );

    return ok(result.value);
  }
}
