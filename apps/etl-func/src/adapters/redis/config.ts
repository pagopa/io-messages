import { z } from "zod";

export const redisConfigSchema = z.object({
  pingInterval: z.number().int().gte(1000),
  url: z.string().url(),
  password: z.string().min(1),
});

export type RedisConfig = z.TypeOf<typeof redisConfigSchema>;
