import z from "zod";

import { ErrorInternal, ErrorNotFound, ErrorValidation } from "./error";

export const massiveJobIDSchema = z.ulid().brand("MassiveJobID");
export type MassiveJobID = z.infer<typeof massiveJobIDSchema>;

export const massiveProgressSchema = z.object({
  notificationId: z.uuid(),
  jobId: massiveJobIDSchema,
  scheduledTimestamp: z.number().int().positive(),
  completed: z.boolean(),
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
  executionTimeInHours: z.number().int().min(2).max(12).default(2),
  id: massiveJobIDSchema,
  startTimeTimestamp: z
    .number()
    .int()
    .positive()
    .default(() => Math.floor((Date.now() + 60 * 60 * 1000) / 1000)), // default to 1 hour from now
  status: MassiveJobStatusEnum,
  title: z.string().min(1).max(500),
  progress: z.array(massiveProgressSchema).optional(),
});

export type MassiveJob = z.infer<typeof MassiveJobSchema>;

export interface MassiveJobsRepository {
  getMassiveJob: (
    job: MassiveJobID,
  ) => Promise<ErrorInternal | ErrorNotFound | MassiveJob>;
  createMassiveJob: (job: MassiveJob) => Promise<ErrorInternal | string>;
  updateMassiveJob: (
    job: MassiveJob,
  ) => Promise<ErrorInternal | ErrorNotFound | string>;
}

export interface MassiveProgressRepository {
  listMassiveJobProgress: (
    job: MassiveJobID,
  ) => Promise<ErrorInternal | MassiveProgress[]>;
}

export const CreateMassiveJobPayloadSchema = MassiveJobSchema.omit({
  id: true,
  status: true,
});

export type CreateMassiveJobPayload = z.infer<
  typeof CreateMassiveJobPayloadSchema
>;
