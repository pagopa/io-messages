import { Container, RestError, SqlQuerySpec } from "@azure/cosmos";
import { z } from "zod";

import {
  ErrorInternal,
  ErrorNotFound,
  ErrorTooManyRequests,
} from "../../domain/error";
import {
  MassiveJobID,
  MassiveProgressRepository,
  MassiveProgressStatus,
  massiveProgressSchema,
} from "../../domain/massive-jobs";

export class CosmosMassiveProgressAdapter implements MassiveProgressRepository {
  constructor(private container: Container) {}

  async listMassiveJobPendingProgress(jobID: MassiveJobID) {
    const querySpec: SqlQuerySpec = {
      parameters: [
        {
          name: "@partitionKey",
          value: jobID,
        },
        {
          name: "@status",
          value: "PENDING",
        },
      ],
      query:
        "SELECT * FROM c WHERE c.jobId = @partitionKey and c.status = @status",
    };

    try {
      const { resources } = await this.container.items
        .query(querySpec, { partitionKey: jobID })
        .fetchAll();

      const parsedResults = resources.map((document) =>
        massiveProgressSchema.parse(document),
      );

      return parsedResults;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return new ErrorInternal(
          "Invalid Massive Progress obtained from cosmos",
          err.issues,
        );
      }

      return new ErrorInternal("Failed to list massive job progress", err);
    }
  }

  async listMassiveJobProgress(jobId: MassiveJobID) {
    try {
      const querySpec: SqlQuerySpec = {
        parameters: [
          {
            name: "@partitionKey",
            value: jobId,
          },
        ],
        query: "SELECT * FROM c WHERE c.jobId = @partitionKey",
      };

      const { resources } = await this.container.items
        .query(querySpec, { partitionKey: jobId })
        .fetchAll();

      const parsedResults = resources.map((document) =>
        massiveProgressSchema.parse(document),
      );

      return parsedResults;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return new ErrorInternal(
          "Invalid Massive Progress obtained from cosmos",
          err.issues,
        );
      }

      return new ErrorInternal("Failed to list massive job progress", err);
    }
  }

  async setStatus(
    notificationID: string,
    jobID: string,
    newStatus: MassiveProgressStatus,
  ) {
    try {
      const patchResult = await this.container
        .item(notificationID, jobID)
        .patch({
          operations: [{ op: "set", path: "/status", value: newStatus }],
        });

      return patchResult.activityId;
    } catch (err) {
      if (err instanceof RestError) {
        switch (err.statusCode) {
          case 404:
            return new ErrorNotFound(
              `Could not find any progress with notificationId ${notificationID} and jobId: ${jobID}`,
              err.message,
            );
          case 429:
            return new ErrorTooManyRequests(`Too many requests`, err.message);

          default:
            return new ErrorInternal(
              `Error while patching the progress with notificationId: ${notificationID}`,
              err.message,
            );
        }
      }

      return new ErrorInternal(
        `Error while patching the progress with notificationId: ${notificationID}: ${err}`,
      );
    }
  }
}
