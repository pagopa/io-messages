import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import * as ai from "applicationinsights";
import {
  EventTelemetry,
  ExceptionTelemetry,
} from "applicationinsights/out/Declarations/Contracts";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/function";

import { IConfig } from "./config";

// Avoid to initialize Application Insights more than once
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
// Avoid to initialize Application Insights more than once
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const initTelemetryClient = (config: IConfig): ai.TelemetryClient =>
  ai.defaultClient
    ? ai.defaultClient
    : initAppInsights(config.APPLICATIONINSIGHTS_CONNECTION_STRING, {
        // We need to disable tracing only when we are testing locally because
        // interfere with azurite docker container.
        isTracingDisabled: !config.isProduction,
        samplingPercentage: config.APPINSIGHTS_SAMPLING_PERCENTAGE,
      });

export type TelemetryClient = ReturnType<typeof initTelemetryClient>;

export const trackEvent = (
  telemetryClient: TelemetryClient,
  event: EventTelemetry,
): void => {
  pipe(
    O.fromNullable(telemetryClient),
    O.map((client) => O.tryCatch(() => client.trackEvent(event))),
  );
};

export const trackException = (
  telemetryClient: TelemetryClient,
  event: ExceptionTelemetry,
): void => {
  pipe(
    O.fromNullable(telemetryClient),
    O.map((client) => O.tryCatch(() => client.trackException(event))),
  );
};
