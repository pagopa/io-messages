import { RetryOptions } from "durable-functions";

import { getConfigOrThrow } from "../../utils/config";
import { getCallableActivity as getDeleteInstallationCallableActivity } from "../HandleNHDeleteInstallationCallActivity";
import { getHandler } from "./handler";

const config = getConfigOrThrow();

const retryOptions = new RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER);
retryOptions.backoffCoefficient = 1.5;

const deleteInstallationActivity = getDeleteInstallationCallableActivity(retryOptions);

export const handler = getHandler({
  deleteInstallationActivity,
});
