import { z } from "zod";

export const applicationInsightsSchema = z.object({
  connectionString: z.string().min(1),
  samplingPercentage: z.number().int().gt(0).lte(100),
});

export type ApplicationInsightsConfig = z.TypeOf<
  typeof applicationInsightsSchema
>;
