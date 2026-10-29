import type { RedisClientType } from "redis";

import { AppHealthchecker } from "@/application/ports/app-healthcheck.js";
import { GenericError } from "@pagopa/hexagonal-core";
import { getErrorDetail } from "io-messages-common/adapters/error";
import { Result, err, ok } from "neverthrow";

export class RedisClientHealthcheckAdapter implements AppHealthchecker {
  constructor(
    private redisClient: RedisClientType,
    private name?: string,
  ) {}

  async health(): Promise<Result<void, GenericError>> {
    try {
      await this.redisClient.ping();
      return ok(undefined);
    } catch (e) {
      return err(
        new GenericError(
          `redis ${this.name} unavailable: ${getErrorDetail(e)}`,
        ),
      );
    }
  }
}
