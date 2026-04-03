import { Database } from "@azure/cosmos";

import { ErrorInternal } from "../../domain/error";

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
