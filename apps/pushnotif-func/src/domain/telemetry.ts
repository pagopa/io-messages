export interface TrackEventProperties {
  name: string;
  properties?: object;
  tagOverrides?: object;
}

export interface TrackExceptionProperties {
  exception: Error;
  properties?: object;
  tagOverrides?: object;
}

export interface TelemetryService {
  trackEvent(eventTelemetry: TrackEventProperties): void;
  trackException(exceptionTelemetry: TrackExceptionProperties): void;
}
