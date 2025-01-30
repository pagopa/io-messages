import { z } from "zod";

export interface EventProducer<T> {
  publish: (events: T[]) => Promise<void>;
}

export interface EventErrorRepository<T> {
  push: (event: T, reason?: string) => Promise<void>;
}

export const EventErrorTypesEnum = z.enum([
  "MALFORMED_EVENT",
  "INGESTION_PROCESS_ERROR",
]);
