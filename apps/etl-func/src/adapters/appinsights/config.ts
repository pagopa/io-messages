import { z } from "zod";

export const applicationInsightsSchema = z.object({
  connectionString: z.string().min(1),
});

export type ApplicationInsightsConfig = z.TypeOf<
  typeof applicationInsightsSchema
>;
