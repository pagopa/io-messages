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
  id: z.string().min(1), // Equal to the notificationId.
  jobId: massiveJobIDSchema,
  scheduledTimestamp: z.number().int().positive(),
  status: MassiveProgressStatusEnum,
  tags: z.array(z.string().min(1)).min(1), // Non empty array.
});
export type MassiveProgress = z.infer<typeof massiveProgressSchema>;

export const MassiveJobStatusEnum = z.enum([
  "CREATED",
  "PROCESSING",
  "COMPLETED",
  "CANCELED",
]);
export type MassiveJobStatus = z.infer<typeof MassiveJobStatusEnum>;

export const MassiveJobSchema = z.object({
  body: z.string().min(1).max(1000),
  executionTimeInHours: z.number().int().min(2).max(12),
  id: massiveJobIDSchema,
  progress: z.array(massiveProgressSchema).optional(),
  startTimeTimestamp: z.number().int().positive().optional(),
  status: MassiveJobStatusEnum,
  title: z.string().min(1).max(500),
});

export type MassiveJob = z.infer<typeof MassiveJobSchema>;

export interface MassiveJobsRepository {
  createMassiveJob: (job: MassiveJob) => Promise<ErrorInternal | string>;
  getMassiveJob: (
    job: MassiveJobID,
  ) => Promise<ErrorInternal | ErrorNotFound | MassiveJob>;
  setStatus: (
    jobID: MassiveJobID,
    newStatus: MassiveJobStatus,
  ) => Promise<ErrorInternal | ErrorNotFound | string>;
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

export const CreateMassiveJobResponseSchema = z.object({
  id: massiveJobIDSchema,
  status: MassiveJobStatusEnum,
});

export type CreateMassiveJobResponse = z.infer<
  typeof CreateMassiveJobResponseSchema
>;

export const StartMassiveJobResponseSchema = z.object({
  id: massiveJobIDSchema,
  status: MassiveJobStatusEnum,
});

export type StartMassiveJobResponse = z.infer<
  typeof StartMassiveJobResponseSchema
>;

export const CancelMassiveJobResultSchema = z.object({
  jobId: massiveJobIDSchema,
  status: MassiveJobStatusEnum,
});
export type CancelMassiveJobResult = z.infer<
  typeof CancelMassiveJobResultSchema
>;
