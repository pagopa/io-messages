export interface TelemetryService {
  trackEvent(name: string, properties: object): void;
}

export enum TelemetryEventName {
  COLLECT_COUNT_ERROR = "io.com.message.collect.count_error",
  MALFORMED_MESSAGE_STATUSES = "io.com.message_status.ingestion.malformed_documents",
  MALFORMED_MESSAGES = "io.com.message.ingestion.malformed_documents",
  MESSAGE_CONTENT_NOT_FOUND = "io.com.message.ingestion.content_not_found",
  MESSAGE_EXECUTION_ERROR = "io.com.message.ingestion.execution_error",
  MESSAGE_STATUS_EXECUTION_ERROR = "io.com.message_status.ingestion.execution_error",
  REMOTE_CONTENT_CHANGE_FEED_RETRY_FAILURE = "message.cqrs.changefeed.retry.failure",
  UNEXPECTED_ERROR = "io.com.message.ingestion.unexpected_error",
}
