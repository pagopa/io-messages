import z from "zod";

import { ErrorInternal, ErrorNotFound, ErrorTooManyRequests } from "./error";

export const massiveJobIDSchema = z.ulid().brand("MassiveJobID");
export type MassiveJobID = z.infer<typeof massiveJobIDSchema>;

export const MassiveProgressStatusEnum = z.enum([
  "PENDING",
  "FAILED",
  "SENT",
  "CANCELED",
]);
export type MassiveProgressStatus = z.infer<typeof MassiveProgressStatusEnum>;

export const massiveProgressSchema = z.object({
  id: z.uuid(), // Equal to the notificationId returned from the notification hub.
  jobId: massiveJobIDSchema,
  scheduledTimestamp: z.number().int().positive(),
  status: MassiveProgressStatusEnum,
  tags: z.array(z.string().min(1)),
});
export type MassiveProgress = z.infer<typeof massiveProgressSchema>;

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
  executionTimeInHours: z.number().int().min(2).max(12),
  id: massiveJobIDSchema,
  progress: z.array(massiveProgressSchema).optional(),
  startTimeTimestamp: z.number().int().positive(),
  status: MassiveJobStatusEnum,
  title: z.string().min(1).max(500),
});

export type MassiveJob = z.infer<typeof MassiveJobSchema>;

export interface MassiveJobsRepository {
  createMassiveJob: (job: MassiveJob) => Promise<ErrorInternal | string>;
  getMassiveJob: (
    job: MassiveJobID,
  ) => Promise<ErrorInternal | ErrorNotFound | MassiveJob>;
  updateMassiveJob: (
    job: MassiveJob,
  ) => Promise<ErrorInternal | ErrorNotFound | string>;
}

export interface MassiveProgressRepository {
  listMassiveJobPendingProgress: (
    jobID: MassiveJobID,
  ) => Promise<ErrorInternal | MassiveProgress[]>;
  listMassiveJobProgress: (
    job: MassiveJobID,
  ) => Promise<ErrorInternal | MassiveProgress[]>;
  setStatus: (
    notificationID: string,
    jobID: string,
    newStatus: MassiveProgressStatus,
  ) => Promise<ErrorInternal | ErrorNotFound | ErrorTooManyRequests | string>;
}

export const CreateMassiveJobPayloadSchema = z.object({
  body: z.string().min(1).max(1000),
  executionTimeInHours: z.number().int().min(2).max(12).default(2),
  startTimeTimestamp: z
    .number()
    .int()
    .positive()
    .default(() => Math.floor((Date.now() + 60 * 60 * 1000) / 1000)), // default to 1 hour from now
  title: z.string().min(1).max(500),
});

export type CreateMassiveJobPayload = z.infer<
  typeof CreateMassiveJobPayloadSchema
>;
