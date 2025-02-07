import { TelemetryService } from "@/domain/telemetry.js";
import { TelemetryClient } from "applicationinsights";
import appInsight from "applicationinsights";

import { ApplicationInsightsConfig } from "./config.js";

export class ApplicationInsights implements TelemetryService {
  #telemetryClient: TelemetryClient;

  constructor(telemetryClient: TelemetryClient) {
    this.#telemetryClient = telemetryClient;
  }

  trackEvent(name: string, properties: object) {
    this.#telemetryClient.trackEvent({
      name,
      properties,
      tagOverrides: { samplingEnabled: "false" },
    });
  }

  trackEventWithSampling(name: string, properties: object) {
    this.#telemetryClient.trackEvent({
      name,
      properties,
    });
  }
}

export function initTelemetryClient(
  config: ApplicationInsightsConfig,
): TelemetryClient {
  appInsight.setup(config.connectionString).start();
  const telemetryClient = appInsight.defaultClient;
  telemetryClient.config.samplingPercentage = config.samplingPercentage;
  return telemetryClient;
}
