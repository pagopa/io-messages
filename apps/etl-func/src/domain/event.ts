import * as z from "zod";

export interface EventProducer<T> {
  publish: (events: T[]) => Promise<void>;
}

export interface EventCollector<T> {
  collect: (events: T[]) => Promise<void>;
}

export const eventsSummarySchema = z.object({
  count: z.number().min(1),
  id: z.string().ulid(),
  year: z.string().regex(new RegExp("^(\\d{4})$")),
});
export type EventsSummary = z.TypeOf<typeof eventsSummarySchema>;

export interface EventErrorRepository<T> {
  push: (event: T, reason?: string) => Promise<void>;
}

export const EventErrorTypesEnum = z.enum([
  "MALFORMED_EVENT",
  "INGESTION_PROCESS_ERROR",
  "EVENT_WITH_MISSING_CONTENT",
]);
