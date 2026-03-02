import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import * as ai from "applicationinsights";

import { IConfig } from "./config";
import { env } from "process";

// Avoid to initialize Application Insights more than once
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const initTelemetryClient = (config: IConfig): ai.TelemetryClient =>
  ai.defaultClient
    ? ai.defaultClient
    : initAppInsights(config.APPLICATIONINSIGHTS_CONNECTION_STRING, {
        // We need to disable tracing only when we are testing locally because
        // interfere with azurite docker container.
        isTracingDisabled: !env.isProduction,
        samplingPercentage: 5,
      });
