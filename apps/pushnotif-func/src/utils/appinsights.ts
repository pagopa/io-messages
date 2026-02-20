import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import * as ai from "applicationinsights";

import { IConfig } from "./config";

export const initTelemetryClient = (
  env: IConfig,
): ReturnType<typeof initAppInsights> | ai.TelemetryClient =>
  ai.defaultClient
    ? ai.defaultClient
    : initAppInsights(env.APPLICATIONINSIGHTS_CONNECTION_STRING, {
        // We need to disable tracing only when we are testing locally because
        // interfere with azurite docker container.
        isTracingDisabled: !env.isProduction,
        samplingPercentage: env.APPINSIGHTS_SAMPLING_PERCENTAGE,
      });

export type TelemetryClient = ReturnType<typeof initTelemetryClient>;
