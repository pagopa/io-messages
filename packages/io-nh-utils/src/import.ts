import { NotificationHubsClient } from "@azure/notification-hubs";
import { program } from "commander";

import { migrateInstallation } from "./notification-hub/index";
import { RegRow } from "./notification-hub/types";
import { parseEnvVariable, readCsv } from "./utils/index";

interface IImportOptions {
  fromNotificationHub: {
    connectionString: string;
    hubName: string;
  };
  rows: RegRow[];
  toNotificationHub: {
    connectionString: string;
    hubName: string;
  };
}

const run = async ({
  fromNotificationHub,
  rows,
  toNotificationHub,
}: IImportOptions) => {
  const fromClient = new NotificationHubsClient(
    fromNotificationHub.connectionString,
    fromNotificationHub.hubName,
  );
  const toClient = new NotificationHubsClient(
    toNotificationHub.connectionString,
    toNotificationHub.hubName,
  );

  const installationIds = [...new Set(rows.map((r) => r.installationId))];
  const errors: string[] = [];

  const start = Date.now();

  const batches = [];
  for (let i = 0; i < installationIds.length; i += 100) {
    batches.push(installationIds.slice(i, i + 100));
  }
  for await (const batch of batches) {
    await Promise.all(
      batch.map(async (installationId) => {
        try {
          await migrateInstallation(fromClient, toClient, installationId);
        } catch (error) {
          errors.push(installationId);
          //eslint-disable-next-line no-console
          console.error(
            `Error importing installation ${installationId}: ${error.message}`,
          );
        }
      }),
    );
    //eslint-disable-next-line no-console
    console.log(
      `${new Date(Date.now()).toLocaleString("it-IT")} - Imported ${installationIds.indexOf(installationId)} installations...`,
    );
    //eslint-disable-next-line no-console
    console.log(`Last installation imported: ${installationId}`);
  }
  const end = Date.now();
  const diffMs = end - start;
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  //eslint-disable-next-line no-console
  console.log(
    `Imported ${installationIds.length} installations in ${minutes}m ${seconds}s`,
  );
  if (errors.length > 0) {
    //eslint-disable-next-line no-console
    console.log(
      `Could not import the following installation ids: ${errors.join(", ")}`,
    );
  }
};

program
  .version("1.0.0")
  .description("Import Notification Hub installations from CSV")
  .option("-p, --path <PATH>", "Full path to the CSV file")
  .action(async (options) => {
    const fromConnectionString = parseEnvVariable("FROM_NH_CONNECTION_STRING");
    const fromHubName = parseEnvVariable("FROM_NH_HUB_NAME");
    const toConnectionString = parseEnvVariable("TO_NH_CONNECTION_STRING");
    const toHubName = parseEnvVariable("TO_NH_HUB_NAME");

    const { path } = options;
    const rows: RegRow[] = await readCsv(path);

    await run({
      fromNotificationHub: {
        connectionString: fromConnectionString,
        hubName: fromHubName,
      },
      rows,
      toNotificationHub: {
        connectionString: toConnectionString,
        hubName: toHubName,
      },
    });

    //eslint-disable-next-line no-console
    console.log(
      `Imported ${rows.length} registrations in ${toHubName} from ${path}`,
    );
  });

program.parse(process.argv);
