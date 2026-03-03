import { TelemetryService } from "@/domain/telemetry";
import * as ai from "applicationinsights";

export class TelemetryClient implements TelemetryService {
  #telemetryClient: ai.TelemetryClient;

  constructor(appInsightsTelemetryClient: ai.TelemetryClient) {
    this.#telemetryClient = appInsightsTelemetryClient;
  }

  trackEvent(name: string, properties: object): void {
    this.#telemetryClient.trackEvent({
      name,
      properties,
      tagOverrides: { samplingEnabled: "false" },
    });
  }
}
