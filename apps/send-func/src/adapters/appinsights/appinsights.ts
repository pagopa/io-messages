import { TelemetryService } from "@/domain/telemetry.js";
import { TelemetryClient } from "applicationinsights";
import appInsight from "applicationinsights";

import { ApplicationInsightsConfig } from "./config.js";

export class TelemetryEventService implements TelemetryService {
  #telemetryClient: TelemetryClient;

  constructor(client: TelemetryClient) {
    this.#telemetryClient = client;
  }

  trackEvent(name: string, properties: object) {
    this.#telemetryClient.trackEvent({
      name,
      properties,
    });
  }
}

export function initNoSamplingClient(
  config: ApplicationInsightsConfig,
): TelemetryClient {
  appInsight.setup(config.connectionString).start();
  const telemetryClient = new appInsight.TelemetryClient(
    config.connectionString,
  );
  telemetryClient.config.samplingPercentage = 100;
  return telemetryClient;
}
