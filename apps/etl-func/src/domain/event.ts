import * as z from "zod";

export interface EventProducer<T> {
  publish: (events: T[]) => Promise<void>;
}

export interface EventCollector<T> {
  collect: (events: T[]) => Promise<void>;
}

export const eventsSummarySchema = z.object({
  count: z.number().min(1),
  id: z.string().regex(new RegExp("^\\d{4}-W\\d{2}$")),
  year: z.string().regex(new RegExp("^(\\d{4})$")),
});
export type EventsSummary = z.TypeOf<typeof eventsSummarySchema>;
