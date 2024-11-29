import { RecipientRepository } from "@/domain/interfaces/tokenizer.js";
import {
  RedisClientType,
  RedisDefaultModules,
  RedisFunctions,
  RedisScripts,
} from "redis";

export default class RedisRecipientRepository implements RecipientRepository {
  #client: RedisClientType<RedisDefaultModules, RedisFunctions, RedisScripts>;

  constructor(
    client: RedisClientType<RedisDefaultModules, RedisFunctions, RedisScripts>,
  ) {
    this.#client = client;
  }

  #key(fiscalCode: string) {
    return `user:${fiscalCode.toLowerCase()}:recipient.id`;
  }

  async get(id: string) {
    return (await this.#client.get(this.#key(id))) || undefined;
  }

  async upsert(fiscalCode: string, recipientId: string) {
    await this.#client.set(this.#key(fiscalCode), recipientId);
  }
}
