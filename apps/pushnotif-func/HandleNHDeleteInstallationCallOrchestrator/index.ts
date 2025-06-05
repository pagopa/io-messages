import * as df from "durable-functions";

import { getCallableActivity as getDeleteInstallationCallableActivity } from "../HandleNHDeleteInstallationCallActivity";
import { getConfigOrThrow } from "../utils/config";
import { getHandler } from "./handler";

const config = getConfigOrThrow();

const deleteInstallationActivity = getDeleteInstallationCallableActivity({
  ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5,
});

const handler = getHandler({
  deleteInstallationActivity,
});
const orchestrator = df.orchestrator(handler);

export default orchestrator;
