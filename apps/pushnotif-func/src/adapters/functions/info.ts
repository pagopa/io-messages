import { Database } from "@azure/cosmos";
import { HttpHandler } from "@azure/functions";
import { NotificationHubsClient } from "@azure/notification-hubs";
import { BlobServiceWithFallBack } from "@pagopa/azure-storage-legacy-migration-kit";
import { BlobService } from "azure-storage";
import { readFile } from "fs/promises";
import { join } from "path";

import { ErrorInternal } from "../../domain/error";

const cosmosHealthcheck = async (
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

const blobServiceHealthcheck = async (
  service: BlobService,
): Promise<ErrorInternal | undefined> => {
  try {
    await new Promise((resolve, reject) => {
      service.getServiceProperties((error, _, response) => {
        if (!error && response.statusCode === 200) {
          resolve(true);
        } else {
          reject(error);
        }
      });
    });
  } catch (err) {
    return new ErrorInternal(`Healthcheck failed for storage account`, err);
  }
};

const notificationHubHealthcheck = async (
  client: NotificationHubsClient,
): Promise<ErrorInternal | undefined> => {
  try {
    await client.deleteInstallation("test");
  } catch (err) {
    return new ErrorInternal(`Healthcheck failed for notification hub`, err);
  }
};

export const getInfoHandler =
  (
    apiCosmosdb: Database,
    pushCosmosdb: Database,
    blobService: BlobServiceWithFallBack,
    notificationHubClients: NotificationHubsClient[],
  ): HttpHandler =>
  async () => {
    const healthChecks = [
      cosmosHealthcheck(apiCosmosdb),
      cosmosHealthcheck(pushCosmosdb),
      blobServiceHealthcheck(blobService.primary),
      ...notificationHubClients.map(notificationHubHealthcheck),
    ];

    // This is temporary, we will remove migration toolkit soon.
    if (blobService.secondary) {
      healthChecks.push(blobServiceHealthcheck(blobService.secondary));
    }

    const healthChecksResults = await Promise.all(healthChecks);

    const errors = healthChecksResults.filter(
      (result) => result instanceof ErrorInternal,
    );

    if (errors.length > 0) {
      return {
        body: JSON.stringify({
          errors: errors.map((e) => `${e.message} ${e.cause}`),
        }),
        status: 500,
      };
    }

    try {
      const packageJsonPath = join(process.cwd(), "package.json");
      const pkgRaw = await readFile(packageJsonPath, "utf-8");
      const pkg = JSON.parse(pkgRaw);
      return {
        body: JSON.stringify({
          name: pkg.name,
          version: pkg.version,
        }),
        headers: { "Content-Type": "application/json" },
        status: 200,
      };
    } catch {
      return {
        body: JSON.stringify({ error: "Could not read function info" }),
        status: 500,
      };
    }
  };
