import { CosmosDBHandler, InvocationContext } from "@azure/functions";
import { rcConfigurationSchema } from "io-messages-common/domain/remote-content";

import {
  TelemetryEventName,
  TelemetryService,
} from "../../domain/telemetry.js";
import { AlignRemoteContentConfigurationUseCase } from "../../domain/use-cases/align-remote-content-configuration.js";

const remoteContentMessageConfigurationChangeFeedHandler =
  (
    alignRemoteContentConfiguration: AlignRemoteContentConfigurationUseCase,
    telemetryService: TelemetryService,
  ): CosmosDBHandler =>
  async (documents: unknown[], context: InvocationContext) => {
    try {
      for (const document of documents) {
        const configuration = rcConfigurationSchema.parse(document);

        await alignRemoteContentConfiguration.execute(configuration);
      }
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));

      telemetryService.trackEvent(
        TelemetryEventName.REMOTE_CONTENT_CHANGE_FEED_RETRY_FAILURE,
        {
          detail: failure.message,
          invocationId: context.invocationId,
          isSuccess: "false",
        },
      );
      context.error(failure.message);
      throw failure;
    }
  };

export default remoteContentMessageConfigurationChangeFeedHandler;
