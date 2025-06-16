import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import * as ai from "applicationinsights";

import { IConfig } from "./config";

// Avoid to initialize Application Insights more than once
export const initTelemetryClient = (
  env: IConfig,
): ReturnType<typeof initAppInsights> | ai.TelemetryClient =>
  ai.defaultClient
    ? ai.defaultClient
    : initAppInsights(env.APPINSIGHTS_INSTRUMENTATIONKEY, {
        samplingPercentage: env.APPINSIGHTS_SAMPLING_PERCENTAGE,
      });

export type TelemetryClient = ReturnType<typeof initTelemetryClient>;
