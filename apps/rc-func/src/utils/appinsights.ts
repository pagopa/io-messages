import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import * as ai from "applicationinsights";

import { IConfig } from "./config";

// Avoid to initialize Application Insights more than once
export const initTelemetryClient = (
  config: IConfig,
): ReturnType<typeof initAppInsights> | ai.TelemetryClient =>
  ai.defaultClient
    ? ai.defaultClient
    : initAppInsights(config.APPLICATIONINSIGHTS_CONNECTION_STRING, {
        isTracingDisabled: !config.isProduction,
        samplingPercentage: config.APPINSIGHTS_SAMPLING_PERCENTAGE,
      });

export type TelemetryClient = ReturnType<typeof initTelemetryClient>;
