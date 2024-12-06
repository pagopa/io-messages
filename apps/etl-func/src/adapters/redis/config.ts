import { z } from "zod";

export const redisConfigSchema = z.object({
  accessKey: z.string().min(1),
  pingInterval: z.number().int().gt(1000),
  url: z.string().url(),
});

export type RedisConfig = z.TypeOf<typeof redisConfigSchema>;
