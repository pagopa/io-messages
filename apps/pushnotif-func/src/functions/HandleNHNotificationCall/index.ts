import { initTelemetryClient } from "../../utils/appinsights";
import { getConfigOrThrow } from "../../utils/config";
// TODO: remove this useless module and move the handler to main.ts
const config = getConfigOrThrow();

initTelemetryClient(config);

export { getHandler } from "./handler";
