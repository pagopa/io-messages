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
        const configuration = rcConfigurationSchema.safeParse(document);

        if (configuration.success) {
          await alignRemoteContentConfiguration.execute(configuration.data);
        } else {
          telemetryService.trackEvent(
            TelemetryEventName.REMOTE_CONTENT_CHANGE_FEED_PARSE_FAILURE,
            {
              detail: "Invalid configuration document",
              invocationId: context.invocationId,
            },
          );
        }
      }
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));

      telemetryService.trackEvent(
        TelemetryEventName.REMOTE_CONTENT_CHANGE_FEED_RETRY_FAILURE,
        {
          detail: failure.message,
          invocationId: context.invocationId,
        },
      );
      context.error(failure.message);
      throw failure;
    }
  };

export default remoteContentMessageConfigurationChangeFeedHandler;
