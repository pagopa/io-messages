import * as z from "zod";

export const timestampSchema = z.number().int().gte(0);
export type Timestamp = z.TypeOf<typeof timestampSchema>;
