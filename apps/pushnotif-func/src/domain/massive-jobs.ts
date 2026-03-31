import z from "zod";

import { ErrorInternal, ErrorNotFound } from "./error";

const MassiveJobStatusEnum = z.enum([
  "CREATED",
  "PROCESSING",
  "COMPLETED",
  "STOPPED",
  "FAILED",
]);
export type MassiveJobStatus = z.infer<typeof MassiveJobStatusEnum>;

export const MassiveJobSchema = z.object({
  body: z.string().min(1),
  executionTimeInHours: z.number().int().min(2).max(12).default(2),
  id: z.uuid(),
  startTimeTimestamp: z
    .number()
    .int()
    .positive()
    .default(() => Math.floor((Date.now() + 60 * 60 * 1000) / 1000)), // default to 1 hour from now
  status: MassiveJobStatusEnum,
  title: z.string().min(1),
});

export type MassiveJob = z.infer<typeof MassiveJobSchema>;

export interface MassiveJobsRepository {
  createMassiveJob: (job: MassiveJob) => Promise<ErrorInternal | string>;
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
