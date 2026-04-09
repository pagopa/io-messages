import { Container, SqlQuerySpec } from "@azure/cosmos";
import { z } from "zod";

import { ErrorInternal } from "../../domain/error";
import {
  MassiveJobID,
  MassiveProgressRepository,
  massiveProgressSchema,
} from "../../domain/massive-jobs";

export class CosmosMassiveProgressAdapter implements MassiveProgressRepository {
  constructor(private container: Container) {}

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
}
