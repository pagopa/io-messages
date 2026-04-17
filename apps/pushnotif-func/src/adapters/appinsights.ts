import {
  TelemetryService,
  TrackEventProperties,
  TrackExceptionProperties,
} from "@/domain/telemetry";
import * as ai from "applicationinsights";

export class TelemetryClient implements TelemetryService {
  #telemetryClient: ai.TelemetryClient;

  constructor(appInsightsTelemetryClient: ai.TelemetryClient) {
    this.#telemetryClient = appInsightsTelemetryClient;
  }

  trackEvent({ name, properties }: TrackEventProperties): void {
    this.#telemetryClient.trackEvent({
      name,
      properties,
      tagOverrides: { samplingEnabled: "false" },
    });
  }

  trackException({ exception, properties }: TrackExceptionProperties): void {
    this.#telemetryClient.trackException({
      exception,
      properties,
      tagOverrides: { samplingEnabled: "false" },
    });
  }
}
