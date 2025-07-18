import { AzureFunction } from "@azure/functions";
import {
  ACTIVATION_COLLECTION_NAME,
  ActivationModel,
} from "@pagopa/io-functions-commons/dist/src/models/activation";
import {
  MESSAGE_COLLECTION_NAME,
  MessageModel,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  MESSAGE_STATUS_COLLECTION_NAME,
  MessageStatusModel,
} from "@pagopa/io-functions-commons/dist/src/models/message_status";
import {
  PROFILE_COLLECTION_NAME,
  ProfileModel,
} from "@pagopa/io-functions-commons/dist/src/models/profile";
import {
  SERVICE_PREFERENCES_COLLECTION_NAME,
  ServicesPreferencesModel,
} from "@pagopa/io-functions-commons/dist/src/models/service_preference";
import { Second } from "@pagopa/ts-commons/lib/units";
import { createBlobService } from "azure-storage";

import { initTelemetryClient } from "../../utils/appinsights";
import { getConfigOrThrow } from "../../utils/config";
import { cosmosdbInstance } from "../../utils/cosmosdb";
import { CommonMessageData } from "../../utils/events/message";
import { makeRetrieveExpandedDataFromBlob } from "../../utils/with-expanded-input";
import { getProcessMessageHandler } from "./handler";

const config = getConfigOrThrow();

const profileModel = new ProfileModel(
  cosmosdbInstance.container(PROFILE_COLLECTION_NAME),
);

const messageModel = new MessageModel(
  cosmosdbInstance.container(MESSAGE_COLLECTION_NAME),
  config.MESSAGE_CONTAINER_NAME,
);

const blobServiceForMessageContent = createBlobService(
  config.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING,
);

const blobServiceForTemporaryProcessingMessage = createBlobService(
  config.IO_COM_STORAGE_CONNECTION_STRING,
);

const servicePreferencesModel = new ServicesPreferencesModel(
  cosmosdbInstance.container(SERVICE_PREFERENCES_COLLECTION_NAME),
  SERVICE_PREFERENCES_COLLECTION_NAME,
);

const messageStatusModel = new MessageStatusModel(
  cosmosdbInstance.container(MESSAGE_STATUS_COLLECTION_NAME),
);

const activationModel = new ActivationModel(
  cosmosdbInstance.container(ACTIVATION_COLLECTION_NAME),
);

const telemetryClient = initTelemetryClient(config);

const retrieveProcessingMessageData = makeRetrieveExpandedDataFromBlob(
  CommonMessageData,
  blobServiceForTemporaryProcessingMessage,
  config.PROCESSING_MESSAGE_CONTAINER_NAME,
);

const activityFunctionHandler: AzureFunction = getProcessMessageHandler({
  TTL_FOR_USER_NOT_FOUND: config.TTL_FOR_USER_NOT_FOUND,
  isOptInEmailEnabled: config.FF_OPT_IN_EMAIL_ENABLED,
  lActivation: activationModel,
  lBlobService: blobServiceForMessageContent,
  lMessageModel: messageModel,
  lMessageStatusModel: messageStatusModel,
  lProfileModel: profileModel,
  lServicePreferencesModel: servicePreferencesModel,
  optOutEmailSwitchDate: config.OPT_OUT_EMAIL_SWITCH_DATE,
  pendingActivationGracePeriod:
    config.PENDING_ACTIVATION_GRACE_PERIOD_SECONDS as Second,
  retrieveProcessingMessageData,
  telemetryClient,
});

export default activityFunctionHandler;
