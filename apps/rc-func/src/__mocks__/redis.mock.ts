import { vi } from "vitest";

import { RedisClientFactory } from "../utils/redis";
export const redisClientMock = {
  getInstance: vi.fn(),
} as unknown as RedisClientFactory;
