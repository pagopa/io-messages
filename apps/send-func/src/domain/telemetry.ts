export interface TelemetryService {
  trackEvent(name: string, properties?: object): void;
}

export enum TelemetryEventName {
  SEND_AAR_ATTACHMENT_SERVER_ERROR = "io.com.send.aar.send_aar_attachment_server_error",
  SEND_AAR_NOTIFICATION_SERVER_ERROR = "io.com.send.aar.send_aar_notification_server_error",
  SEND_AAR_QRCODE_CHECK_DATA_NOT_FOUND = "io.com.send.aar.send_aar_qrcode_check_data_not_found",
  SEND_AAR_QRCODE_CHECK_MALFORMED_403 = "io.com.send.aar.send_aar_qrcode_check_malformed_403",
  SEND_AAR_QRCODE_CHECK_SERVER_ERROR = "io.com.send.aar.send_aar_qrcode_check_server_error",
}
