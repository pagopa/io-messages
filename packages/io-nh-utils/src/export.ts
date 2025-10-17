import { program } from "commander";
import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";

import { getInstallations } from "./notification-hub/index";
import { RegRow } from "./notification-hub/types";
import { parseConnectionString } from "./notification-hub/utils";
import { outputPath, parseEnvVariable, readCsv } from "./utils/index";

interface IExportOptions {
  connectionString: string;
  exportFunction?: (rows: string[]) => Promise<void>;
  hubName: string;
  maxInstallations?: number;
  oldInstallations?: string[];
  resumeToken?: string;
}

const runWithPagination = async ({
  connectionString,
  exportFunction,
  hubName,
  maxInstallations,
  oldInstallations,
  resumeToken,
}: IExportOptions) => {
  const { key, keyName, namespace } = parseConnectionString(connectionString);

  const { continuationToken, rows } = await getInstallations({
    exportFunction,
    oldInstallations,
    sas: { hubName, key, keyName, namespace },
    token: resumeToken,
    top: maxInstallations,
  });

  return { continuationToken, rows };
};

program
  .version("1.0.0")
  .description("Export Notification Hub installations to CSV")
  .option("-t, --top [TOP]", "Max amount of installations to retrieve", "1000")
  .option("-k, --token [TOKEN]", "Continuation token for pagination")
  .option("-p, --path [PATH]", "Full path to the CSV file", outputPath())
  .action(async (options) => {
    const connectionString = parseEnvVariable("FROM_NH_CONNECTION_STRING");
    const hubName = parseEnvVariable("FROM_NH_HUB_NAME");

    const { path, token, top } = options;
    let rows: string[] = [];
    let continuationToken: string | undefined = token;
    let oldInstallations: string[] = [];

    const fileExists = fs.existsSync(path);
    if (fileExists) {
      const rows: RegRow[] = await readCsv(path);
      oldInstallations = rows.map((row) => row.installationId);
    }
    const csvWriter = createObjectCsvWriter({
      append: fileExists,
      header: [{ id: "installationId", title: "installationId" }],
      path: path,
    });

    const exportFunction = async (newRows: string[]) => {
      await csvWriter.writeRecords(
        newRows.map((installationId) => ({ installationId })),
      );
    };

    const maxRegistrations = parseInt(top || "1000", 10);
    const result = await runWithPagination({
      connectionString,
      exportFunction,
      hubName,
      maxInstallations: maxRegistrations,
      oldInstallations,
      resumeToken: token,
    });

    rows = result.rows;
    continuationToken = result.continuationToken;

    //eslint-disable-next-line no-console
    console.log(`Exported ${rows.length} registrations in ${path}`);
    if (continuationToken)
      //eslint-disable-next-line no-console
      console.log("Continuation token for next execution:", continuationToken);
  });

program.parse(process.argv);
