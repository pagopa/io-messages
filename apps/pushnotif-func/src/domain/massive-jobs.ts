import z from "zod";

import { ErrorInternal, ErrorNotFound, ErrorTooManyRequests } from "./error";

export const massiveNotificationTitleSchema = z.string().min(1).max(500);
export type MassiveNotificationTitle = z.infer<
  typeof massiveNotificationTitleSchema
>;

export const massiveNotificationMessageSchema = z.string().min(1).max(1000);
export type MassiveNotificationMessage = z.infer<
  typeof massiveNotificationMessageSchema
>;

export const massiveNotificationTagSchema = z.string().min(1);
export type MassiveNotificationTag = z.infer<
  typeof massiveNotificationTagSchema
>;

export const massiveNotificationTagsSchema = z
  .array(massiveNotificationTagSchema)
  .min(1); // Non empty array.
export type MassiveNotificationTags = z.infer<
  typeof massiveNotificationTagsSchema
>;

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
  tags: massiveNotificationTagsSchema,
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
  body: massiveNotificationMessageSchema,
  executionTimeInHours: z.number().int().min(2).max(12),
  id: massiveJobIDSchema,
  progress: z.array(massiveProgressSchema).optional(),
  startTimeTimestamp: z.number().int().positive(),
  status: MassiveJobStatusEnum,
  title: massiveNotificationTitleSchema,
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
  create: (progress: MassiveProgress) => Promise<ErrorInternal | string>;
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

export const CancelMassiveJobResultSchema = z.object({
  jobId: massiveJobIDSchema,
  status: MassiveJobStatusEnum,
});
export type CancelMassiveJobResult = z.infer<
  typeof CancelMassiveJobResultSchema
>;
