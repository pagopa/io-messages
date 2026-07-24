import type { Logger } from "@pagopa/hexagonal-core/domain/ports";
import type { RedisClientType } from "redis";

import { GenericError, NotFoundError } from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";

import { MalformedEntityError } from "../../../application/ports/error.js";
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

  constructor(
    redisClient: RedisClientType,
    private logger: Logger,
  ) {
    this.#redisClient = redisClient;
  }

  async getCachedRemoteContentConfiguration(
    configurationId: RcConfigurationId,
  ): Promise<
    Result<RCConfiguration, GenericError | MalformedEntityError | NotFoundError>
  > {
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
        new NotFoundError(
          `rc-configuration`,
          `Missing cached ${configurationId} rc configuration`,
        ),
      );
    }
    const parseResult = Result.fromThrowable(
      JSON.parse,
      () =>
        new MalformedEntityError(
          `Malformed cached json rc configuration for ${configurationId}`,
        ),
    )(value);

    if (parseResult.isErr()) {
      return err(parseResult.error);
    }

    const validationResult = rcConfigurationSchema.safeParse(parseResult.value);
    if (!validationResult.success) {
      // If a status is malformed we want to track it
      this.logger.trackEvent({
        name: "RCConfigurationCacheAdapter.getCachedRemoteContentConfiguration.failed.parse",
        properties: {
          errorMessage: validationResult.error.message,
          errorName: validationResult.error.name,
        },
      });
      return err(
        new MalformedEntityError(
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
