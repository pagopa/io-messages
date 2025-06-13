import * as df from "durable-functions";

import { getConfigOrThrow } from "../../utils/config";
import { getCallableActivity as getCreateOrUpdateCallableActivity } from "../HandleNHCreateOrUpdateInstallationCallActivity";
import { getHandler } from "./handler";

const config = getConfigOrThrow();

const createOrUpdateActivity = getCreateOrUpdateCallableActivity({
  ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5,
});

const handler = getHandler({
  createOrUpdateActivity,
});

const orchestrator = df.orchestrator(handler);

export default orchestrator;
