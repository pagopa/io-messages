import * as z from "zod";

export interface EventProducer<T> {
  publish: (events: T[]) => Promise<void>;
}

export interface EventCollector<T> {
  collect: (events: T[]) => Promise<void>;
}

export const eventsSummarySchema = z.object({
  year: z.string().regex(new RegExp("^(\\d{4})$")),
  id: z.string().regex(new RegExp("^\\d{4}-W\\d{2}$")),
  count: z.number().min(0),
});
export type EventsSummary = z.TypeOf<typeof eventsSummarySchema>;
