import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import * as ai from "applicationinsights";

import { IConfig } from "./config";

// Avoid to initialize Application Insights more than once
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const initTelemetryClient = (config: IConfig): ai.TelemetryClient =>
  ai.defaultClient
    ? ai.defaultClient
    : initAppInsights(config.APPLICATIONINSIGHTS_CONNECTION_STRING, {
        disableAppInsights: config.APPINSIGHTS_DISABLE,
        samplingPercentage: config.APPINSIGHTS_SAMPLING_PERCENTAGE,
      });
