export interface TelemetryService {
  trackEvent(name: string, properties?: object): void;
}

export enum TelemetryEventName {
  SEND_AAR_ATTACHMENT_SERVER_ERROR = "io.com.send.aar.attachment_server_error",
  SEND_AAR_CREATE_MANDATE_MALFORMED_403 = "io.com.send.aar.create_mandate_malformed_403",
  SEND_AAR_CREATE_MANDATE_QRCODE_DATA_NOT_FOUND = "io.com.send.aar.create_mandate_qrcode_not_found",
  SEND_AAR_CREATE_MANDATE_SERVER_ERROR = "io.com.send.aar.create_mandate_server_error",
  SEND_AAR_NOTIFICATION_SERVER_ERROR = "io.com.send.aar.notification_server_error",
  SEND_AAR_QRCODE_CHECK_SERVER_ERROR = "io.com.send.aar.qrcode_check_server_error",
}
