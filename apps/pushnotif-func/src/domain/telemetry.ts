export interface TrackEventProperties {
  name: string;
  properties?: object;
}

export interface TrackExceptionProperties {
  exception: Error;
  properties?: object;
}

export interface TelemetryService {
  trackEvent(eventTelemetry: TrackEventProperties): void;
  trackException(exceptionTelemetry: TrackExceptionProperties): void;
}
