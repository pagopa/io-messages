import { initTelemetryClient } from "../utils/appinsights";
import { getConfigOrThrow } from "../utils/config";
import { getHandler } from "./handler";

const config = getConfigOrThrow();

initTelemetryClient(config);

export const index = getHandler(
  config.CANARY_USERS_REGEX,
  config.NOTIFY_VIA_QUEUE_FEATURE_FLAG,
);

export default index;
