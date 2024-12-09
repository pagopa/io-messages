import { FiscalCode } from "@/domain/message-status.js";
import {
  RedisClientType,
  RedisDefaultModules,
  RedisFunctions,
  RedisScripts,
} from "redis";

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
    return (await this.#client.get(this.#key(fiscalCode))) || undefined;
  }

  async upsert(fiscalCode: FiscalCode, recipientId: string) {
    await this.#client.set(this.#key(fiscalCode), recipientId);
  }
}
