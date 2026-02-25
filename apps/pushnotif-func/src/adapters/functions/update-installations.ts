import { installationSummarySchema } from "../../domain/installation-summary";
import { TelemetryService } from "@/domain/telemetry";
import {
  CosmosDBHandler,
  InvocationContext,
  StorageQueueOutput,
} from "@azure/functions";

type UpdateInstallationMessage = { installationId: string };

/**
 * Factory that creates a CosmosDBHandler to process Installation Summary changes.
 *
 * 1. Receives a batch of documents from the Cosmos DB Change Feed.
 * 2. Validates each document against the `installationSummarySchema`.
 * 3. Filters for installations that haven't been updated recently (based on `timeToReach`).
 * 4. Pushes the valid installation IDs to a Storage Queue for downstream processing.
 */
const getInstallationUpdateDispatcher =
  (
    telemetryService: TelemetryService,
    timeToReach: number,
    queueOutput: StorageQueueOutput,
  ): CosmosDBHandler =>
  async (documents: unknown[], context: InvocationContext) => {
    const messagesToSend: UpdateInstallationMessage[] = [];
    for (const document of documents) {
      const parsedResult = installationSummarySchema.safeParse(document);

      if (!parsedResult.success) {
        telemetryService.trackEvent("installation.summary.validation.error", {
          message: "Invalid installation summary",
          invalidDocument: document,
          validationError: parsedResult.error.issues,
        });
        continue;
      }

      // Only process documents that are older than our target sync time.
      if (parsedResult.data.updatedAt > timeToReach) {
        continue;
      }

      messagesToSend.push({ installationId: parsedResult.data.id });
    }

    context.extraOutputs.set(queueOutput, messagesToSend);
  };

export default getInstallationUpdateDispatcher;
