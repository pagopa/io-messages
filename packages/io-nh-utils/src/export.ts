import { NotificationHubsClient } from "@azure/notification-hubs";
import { program } from "commander";
import { createObjectCsvWriter } from "csv-writer";

import {
  getPagedRegistrations,
  getPager,
  getRegistrations,
} from "./notification-hub/index";
import { parseConnectionString } from "./notification-hub/utils";
import { outputPath, parseEnvVariable } from "./utils/index";

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
  const { key, keyName, namespace } = parseConnectionString(connectionString);

  const { continuationToken, rows } = await getPagedRegistrations(
    { hubName, key, keyName, namespace },
    maxRegistrations,
    resumeToken,
  );

  return { continuationToken, rows };
};

const run = async ({ connectionString, hubName }: IExportOptions) => {
  const client = new NotificationHubsClient(connectionString, hubName);

  const pager = getPager(client, 500);

  const { rows } = await getRegistrations(pager, 20);

  return { rows };
};

const saveCsv = async (rows: string[], path: string) => {
  const csvWriter = createObjectCsvWriter({
    header: [{ id: "installationId", title: "installationId" }],
    path,
  });
  await csvWriter.writeRecords(
    rows.map((installationId) => ({ installationId })),
  );
};

program
  .version("1.0.0")
  .description("Export Notification Hub registrations to CSV")
  .option("-t, --top [TOP]", "Max amount of registrations to retrieve", "1000")
  .option("-k, --token [TOKEN]", "Continuation token for pagination")
  .action(async (options) => {
    const connectionString = parseEnvVariable("FROM_NH_CONNECTION_STRING");
    const hubName = parseEnvVariable("FROM_NH_HUB_NAME");

    const { token, top } = options;
    let rows: string[] = [];
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

    //eslint-disable-next-line no-console
    console.log(`Exported ${rows.length} registrations in ${outputPath()}`);
    if (continuationToken)
      //eslint-disable-next-line no-console
      console.log("Continuation token for next execution:", continuationToken);
  });

program.parse(process.argv);
