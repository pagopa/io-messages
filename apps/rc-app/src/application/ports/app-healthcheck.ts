import type { GenericError } from "@pagopa/hexagonal-core";
import type { Result } from "neverthrow";

import z from "zod";

export const appHealthcheckSchema = z.object({
  failures: z.array(z.string()),
});
export type AppHealthcheck = z.TypeOf<typeof appHealthcheckSchema>;

export interface AppHealthchecker {
  /**
   * Health returns the health status of the app.
   */
  health(): Promise<Result<void, GenericError>>;
}
