export interface TelemetryService {
  trackEvent(name: string, properties?: object): void;
}

export enum TelemetryEventName {
  SEND_AAR_ACCEPT_MANDATE_SERVER_ERROR = "io.com.send.aar.accept_mandate_server_error",
  SEND_AAR_ATTACHMENT_SERVER_ERROR = "io.com.send.aar.attachment_server_error",
  SEND_AAR_CREATE_MANDATE_SERVER_ERROR = "io.com.send.aar.create_mandate_server_error",
  SEND_AAR_NOTIFICATION_SERVER_ERROR = "io.com.send.aar.notification_server_error",
  SEND_AAR_QRCODE_CHECK_SERVER_ERROR = "io.com.send.aar.qrcode_check_server_error",
  SEND_LOLLIPPOP_INTEGRATION_CLIENT_ERROR = "io.com.send.lollipop_integration_check_client_error",
}
