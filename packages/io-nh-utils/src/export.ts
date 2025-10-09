import { program } from "commander";
import { NotificationHubsClient } from "@azure/notification-hubs";
import { createObjectCsvWriter } from "csv-writer";
import {
  getPager,
  getRegistrations,
  getPagedRegistrations,
} from "./notification-hub";
import { parseConnectionString } from "./notification-hub/utils";
import { RegRow } from "./notification-hub/types";
import { parseEnvVariable, outputPath } from "./utils";

interface IExportOptions {
  connectionString: string;
  hubName: string;
  maxRegistrations?: number;
  resumeToken?: string;
}

const runWithPagination = async ({
  connectionString,
  hubName,
  maxRegistrations,
  resumeToken,
}: IExportOptions) => {
  const { namespace, keyName, key } = parseConnectionString(connectionString);

  const { rows, continuationToken } = await getPagedRegistrations(
    { namespace, hubName, keyName, key },
    maxRegistrations,
    resumeToken,
  );

  return { rows, continuationToken };
};

const run = async ({ connectionString, hubName }: IExportOptions) => {
  const client = new NotificationHubsClient(connectionString, hubName);

  const pager = getPager(client, 500);

  const { rows } = await getRegistrations(pager, 20);

  return { rows };
};

const saveCsv = async (rows: RegRow[], path: string) => {
  const csvWriter = createObjectCsvWriter({
    path,
    header: [
      { id: "registrationId", title: "registrationId" },
      { id: "installationId", title: "installationId" },
    ],
  });
  await csvWriter.writeRecords(rows);
};

program
  .version("1.0.0")
  .description("Export Notification Hub registrations to CSV")
  .option("-t, --top [TOP]", "Max amount of registrations to retrieve")
  .option("-k, --token [TOKEN]", "Continuation token for pagination")
  .action(async (options) => {
    const connectionString = parseEnvVariable("NH_CONNECTION_STRING");
    const hubName = parseEnvVariable("NH_HUB_NAME");

    const { top, token } = options;
    let rows: RegRow[] = [];
    let continuationToken: string | undefined = token;

    if (top) {
      const maxRegistrations = parseInt(top, 10);
      const result = await runWithPagination({
        connectionString,
        hubName,
        maxRegistrations,
        resumeToken: token,
      });
      rows = result.rows;
      continuationToken = result.continuationToken;
    } else {
      const result = await run({
        connectionString,
        hubName,
      });
      rows = result.rows;
    }

    await saveCsv(rows, outputPath());

    console.log(`Exported ${rows.length} registrations in ${outputPath()}`);
    if (continuationToken)
      console.log("Continuation token for next execution:", continuationToken);
  });

program.parse(process.argv);
