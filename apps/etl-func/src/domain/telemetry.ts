export interface TelemetryService {
  trackEvent: (name: string, properties: object) => void;
}

export enum TelemetryEventName {
  COLLECT_COUNT_ERROR = "io.com.message.collect.count_error",
  CONTENT_NOT_FOUND = "io.com.message_ingestion.content_not_found",
  EXECUTION_ERROR = "io.com.message_ingestion.execution_error",
  MALFORMED_DOCUMENTS = "io.com.message_ingestion.malformed_documents",
}
