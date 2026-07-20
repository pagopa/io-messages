import type { RedisClientType } from "redis";

import { GenericError } from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";

import {
  RCConfiguration,
  RcConfigurationId,
  rcConfigurationSchema,
} from "../../../application/ports/rc-configuration.js";
import { RemoteContentCacheRepository } from "../../../application/ports/rc-configuration-cache.js";

const RC_CONFIGURATION_REDIS_PREFIX = "RC-CONFIGURATION";

export class RCConfigurationCacheAdapter
  implements RemoteContentCacheRepository
{
  #redisClient: RedisClientType;

  constructor(redisClient: RedisClientType) {
    this.#redisClient = redisClient;
  }

  async getCachedRemoteContentConfiguration(
    configurationId: RcConfigurationId,
  ): Promise<Result<RCConfiguration, GenericError>> {
    const getResult = await ResultAsync.fromPromise(
      this.#redisClient.get(
        `${RC_CONFIGURATION_REDIS_PREFIX}-${configurationId}`,
      ),
      (error) => {
        const message = error instanceof Error ? error.message : String(error);
        return new GenericError(`Redis error: ${message}`);
      },
    );

    if (getResult.isErr()) {
      return err(getResult.error);
    }

    const value = getResult.value;
    if (value === null) {
      return err(
        new GenericError(`Missing cached ${configurationId} rc configuration`),
      );
    }
    const parsedValue = JSON.parse(value);
    const validationResult = rcConfigurationSchema.safeParse(parsedValue);
    if (!validationResult.success) {
      return err(
        new GenericError(
          `Malformed cached ${configurationId} rc configuration`,
        ),
      );
    }
    return ok(validationResult.data);
  }

  async setCachedRemoteContentConfiguration(
    configurationId: RcConfigurationId,
    rcConfiguration: RCConfiguration,
    ttlInSeconds?: number,
  ): Promise<Result<RCConfiguration, GenericError>> {
    const value = JSON.stringify(rcConfiguration);
    const setResult = await ResultAsync.fromPromise(
      this.#redisClient.set(
        `${RC_CONFIGURATION_REDIS_PREFIX}-${configurationId}`,
        value,
        ttlInSeconds !== undefined ? { EX: ttlInSeconds } : undefined,
      ),
      (err) => new GenericError(`Redis error: ${err}`),
    );

    if (setResult.isErr()) {
      return err(setResult.error);
    }

    return ok(rcConfiguration);
  }
}
