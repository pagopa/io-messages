export interface TelemetryService {
  trackEvent(name: string, properties?: object): void;
}

export enum TelemetryEventName {
  LOLLIPOP_MIDDLEWARE_GENERIC_SERVER_ERROR = "io.com.lollipop.middleware.generic_server_error",
  LOLLIPOP_MIDDLEWARE_GET_LC_PARAMS_ERROR = "io.com.lollipop.middleware.get_lc_params_error",
  LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR = "io.com.lollipop.middleware.malformed_headers_error",
}
