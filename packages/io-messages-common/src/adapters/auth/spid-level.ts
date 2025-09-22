import { z } from "zod";

export const spidLevelSchema = z.enum([
  "https://www.spid.gov.it/SpidL1",
  "https://www.spid.gov.it/SpidL2",
  "https://www.spid.gov.it/SpidL3",
]);

export type SpidLevel = z.infer<typeof spidLevelSchema>;
