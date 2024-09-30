import { z } from "zod";

export const envSchema = z.object({}).and(z.record(z.string(), z.string()));
