import { FiscalCode } from "io-messages-common/domain/fiscal-code";
import { pino } from "pino";
import {
  RedisClientType,
  RedisDefaultModules,
  RedisFunctions,
  RedisScripts,
} from "redis";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "error" : "debug",
});

export default class RedisRecipientRepository {
  #client: RedisClientType<RedisDefaultModules, RedisFunctions, RedisScripts>;

  constructor(
    client: RedisClientType<RedisDefaultModules, RedisFunctions, RedisScripts>,
  ) {
    this.#client = client;
  }

  #key(fiscalCode: FiscalCode) {
    return `user:${fiscalCode.toLowerCase()}:recipient.id`;
  }

  async get(fiscalCode: FiscalCode) {
    try {
      return (await this.#client.get(this.#key(fiscalCode))) || undefined;
    } catch {
      logger.error("Failed to retrieve recipientId from redis");
      return undefined;
    }
  }

  async upsert(fiscalCode: FiscalCode, recipientId: string) {
    try {
      await this.#client.set(this.#key(fiscalCode), recipientId);
    } catch {
      logger.error("Failed writing recipientId to redis");
    }
  }
}
