import { Context } from "@azure/functions";
import {
  USER_RC_CONFIGURATIONS_COLLECTION_NAME,
  UserRCConfigurationModel,
} from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";

import { initTelemetryClient } from "../../utils/appinsights";
import { getConfigOrThrow } from "../../utils/config";
import { remoteContentCosmosDbInstance } from "../../utils/cosmosdb";
import { handleRemoteContentMessageConfigurationChange } from "./handler";

const config = getConfigOrThrow();

const telemetryClient = initTelemetryClient(config);

const userRCConfigurationModel = new UserRCConfigurationModel(
  remoteContentCosmosDbInstance.container(
    USER_RC_CONFIGURATIONS_COLLECTION_NAME,
  ),
);

const run = async (
  context: Context,
  documents: readonly unknown[],
): Promise<void> => {
  await handleRemoteContentMessageConfigurationChange(
    context,
    userRCConfigurationModel,
    telemetryClient,
    0,
  )(documents);
};

export default run;
