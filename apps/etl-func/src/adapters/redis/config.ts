import { z } from "zod";

export const redisConfigSchema = z.object({
  password: z.string().min(1),
  pingInterval: z.number().int().gte(1000),
  url: z.url(),
});

export type RedisConfig = z.TypeOf<typeof redisConfigSchema>;
