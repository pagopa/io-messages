import z from "zod";

import { ErrorInternal, ErrorNotFound } from "./error";

const MassiveJobProgressStatusEnum = z.enum([
  "SCHEDULED",
  "COMPLETED",
  "STOPPED",
  "FAILED",
]);
export type MassiveJobProgressStatus = z.infer<
  typeof MassiveJobProgressStatusEnum
>;

export const MassiveJobProgressSchema = z.object({
  jobId: z.ulid(),
  id: z.ulid(),
  scheduledTimestamp: z.number().int().positive(),
  status: MassiveJobProgressStatusEnum,
  tags: z.array(z.string()).default([]),
});

export type MassiveJobProgress = z.infer<typeof MassiveJobProgressSchema>;

export interface MassiveJobsRepository {
  createMassiveJob: (
    job: MassiveJobProgress,
  ) => Promise<ErrorInternal | string>;
  updateMassiveJob: (
    job: MassiveJobProgress,
  ) => Promise<ErrorInternal | ErrorNotFound | string>;
}
