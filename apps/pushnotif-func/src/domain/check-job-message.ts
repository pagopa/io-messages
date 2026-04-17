import { z } from "zod";

import { ErrorInternal } from "./error";

export const CheckMassiveJobMessageSchema = z.object({
  jobId: z.ulid(),
  timeToCheckInSeconds: z.number().int().positive(),
});

export type CheckMassiveJobMessage = z.infer<
  typeof CheckMassiveJobMessageSchema
>;

export interface CheckMassiveJobRepository {
  sendMessage: (
    checkMassiveJobMessage: CheckMassiveJobMessage,
  ) => Promise<ErrorInternal | string>;
}
