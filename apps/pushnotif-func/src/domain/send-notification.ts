import { z } from "zod";

import { ErrorInternal } from "./error";

export const ProcessMassiveJobMessageSchema = z.object({
  jobId: z.ulid(),
  message: z.string().min(1).max(1000),
  scheduledTimestamp: z.number().int().positive(),
  tags: z.array(z.string()).default([]),
  title: z.string().min(1).max(500),
});

export type ProcessMassiveJobMessage = z.infer<
  typeof ProcessMassiveJobMessageSchema
>;

export interface ProcessMassiveJobRepository {
  sendMessage: (
    processMassiveJobMessage: ProcessMassiveJobMessage,
  ) => Promise<ErrorInternal | string>;
}
