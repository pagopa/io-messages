import { ErrorInternal } from "../../domain/error";
import { Database } from "@azure/cosmos";

export const cosmosHealthcheck = async (
  db: Database,
): Promise<ErrorInternal | undefined> => {
  try {
    await db.read();
  } catch (err) {
    return new ErrorInternal(
      `Cosmos Healthcheck failed for database ${db.id}`,
      err,
    );
  }
};
