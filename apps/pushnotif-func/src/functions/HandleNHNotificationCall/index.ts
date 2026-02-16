import { initTelemetryClient } from "../../utils/appinsights";
import { getConfigOrThrow } from "../../utils/config";
import { getHandler } from "./handler";

const config = getConfigOrThrow();

initTelemetryClient(config);

export { getHandler } from "./handler";
