import z from "zod";

import { ErrorInternal, ErrorNotFound } from "./error";

export const MassiveJobStatusEnum = z.enum([
  "CREATED",
  "PROCESSING",
  "COMPLETED",
  "STOPPED",
  "FAILED",
]);
export type MassiveJobStatus = z.infer<typeof MassiveJobStatusEnum>;

export const MassiveJobSchema = z.object({
  body: z.string().min(1).max(1000),
  executionTimeInHours: z.number().int().min(2).max(12).default(2),
  id: z.ulid(),
  startTimeTimestamp: z
    .number()
    .int()
    .positive()
    .default(() => Math.floor((Date.now() + 60 * 60 * 1000) / 1000)), // default to 1 hour from now
  status: MassiveJobStatusEnum,
  title: z.string().min(1).max(500),
});

export type MassiveJob = z.infer<typeof MassiveJobSchema>;

export interface MassiveJobsRepository {
  createMassiveJob: (job: MassiveJob) => Promise<ErrorInternal | string>;
  getMassiveJobById: (
    id: string,
  ) => Promise<ErrorInternal | ErrorNotFound | MassiveJob>;
  updateMassiveJob: (
    job: MassiveJob,
  ) => Promise<ErrorInternal | ErrorNotFound | string>;
}

export const CreateMassiveJobPayloadSchema = MassiveJobSchema.omit({
  id: true,
  status: true,
});

export type CreateMassiveJobPayload = z.infer<
  typeof CreateMassiveJobPayloadSchema
>;

export const StartMassiveNotificationJobPayloadSchema = z.object({
  id: z.ulid(),
});

export type StartMassiveNotificationJobPayload = z.infer<
  typeof StartMassiveNotificationJobPayloadSchema
>;
