import { z } from "zod";

export const statusCodeSchema = z.number().int().min(100).max(599);

export type StatusCode = z.infer<typeof statusCodeSchema>;
