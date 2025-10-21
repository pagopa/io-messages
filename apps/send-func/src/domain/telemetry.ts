export interface TelemetryService {
  trackEvent(name: string, properties?: object): void;
}

export enum TelemetryEventName {
  MALFORMED_403_SEND_RESPONSE = "io.com.send.aar.malformed_403_response",
  NOT_FOUND_AAR_SEND_DATA = "io.com.send.aar.not_found_aar_send_data",
  SEND_INTERNAL_SERVER_ERROR = "io.com.send.aar.internal_server_error",
}
