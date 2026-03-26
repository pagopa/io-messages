import { Config } from "@/adapters/config";
import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import * as ai from "applicationinsights";

export const initTelemetryClient = (
  config: Config,
): ReturnType<typeof initAppInsights> | ai.TelemetryClient =>
  ai.defaultClient
    ? ai.defaultClient
    : initAppInsights(config.applicationInsights.connectionString, {
        // We need to disable tracing only when we are testing locally because
        // interfere with azurite docker container.
        isTracingDisabled: config.nodeEnv === "development",
        samplingPercentage: config.applicationInsights.samplingPercentage,
      });

export type TelemetryClient = ReturnType<typeof initTelemetryClient>;
