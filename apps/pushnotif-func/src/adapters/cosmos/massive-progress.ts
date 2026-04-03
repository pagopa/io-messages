import { z } from "zod";
import {
  MassiveJobID,
  massiveProgressSchema,
  MassiveProgressRepository,
} from "../../domain/massive-jobs";
import { Container, SqlQuerySpec } from "@azure/cosmos";
import { ErrorInternal } from "../../domain/error";

export class CosmosMassiveProgressAdapter implements MassiveProgressRepository {
  constructor(private container: Container) {}

  async listMassiveJobProgress(jobId: MassiveJobID) {
    try {
      const querySpec: SqlQuerySpec = {
        query: "SELECT * FROM c WHERE c.category = @partitionKey",
        parameters: [
          {
            name: "@partitionKey",
            value: jobId,
          },
        ],
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

      return new ErrorInternal("Failed to update massive job", err);
    }
  }
}
