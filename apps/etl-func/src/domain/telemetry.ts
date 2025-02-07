export interface TelemetryService {
  trackEvent(name: string, properties: object): void;
  trackEventWithSampling(name: string, properties: object): void;
}

export enum TelemetryEventName {
  CONTENT_NOT_FOUND = "io.com.message_ingestion.content_not_found",
  EXECUTION_ERROR = "io.com.message_ingestion.execution_error",
  MALFORMED_DOCUMENTS = "io.com.message_ingestion.malformed_documents",
}
