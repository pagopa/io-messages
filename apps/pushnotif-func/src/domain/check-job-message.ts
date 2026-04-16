import { z } from "zod";

import { ErrorInternal } from "./error";

export const CheckJobMessageSchema = z.object({
  jobId: z.ulid(),
  visibilityTimeoutInSeconds: z.number().int().positive(),
});

export type CheckJobMessage = z.infer<typeof CheckJobMessageSchema>;

export interface CheckJobMessageRepository {
  sendMessage: (
    checkJobMessage: CheckJobMessage,
  ) => Promise<ErrorInternal | string>;
}
