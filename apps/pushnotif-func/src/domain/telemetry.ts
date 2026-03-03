export interface TelemetryService {
  trackEvent(name: string, properties: object): void;
}
