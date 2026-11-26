import type { GenericError } from "@pagopa/hexagonal-core";
import type { Result } from "neverthrow";

import { z } from "zod";

export const appInfoSchema = z.object({
  name: z.string().regex(/\S/),
  version: z.string().regex(/\S/),
});

export type AppInfo = z.infer<typeof appInfoSchema>;

export interface AppInfoReader {
  getAppInfo(): Promise<Result<AppInfo, GenericError>>;
}
