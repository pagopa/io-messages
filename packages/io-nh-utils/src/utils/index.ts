import csv from "csv-parser";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import { RegRow } from "../notification-hub/types";
import { createObjectCsvWriter } from "csv-writer";

dotenv.config();

export const outputPath = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${timestamp}.csv`;
  if (!fs.existsSync(path.resolve(process.cwd(), "data"))) {
    fs.mkdirSync(path.resolve(process.cwd(), "data"), { recursive: true });
  }
  const outputPath = path.resolve(process.cwd(), "data", fileName);
  return outputPath;
};

export const parseEnvVariable = (envVar: string, optional = false) => {
  const value = process.env[envVar];

  if (!value && !optional) throw new Error(`${envVar} is not set`);

  return value;
};

export const readCsv = async (path: string): Promise<RegRow[]> =>
  new Promise((resolve, reject) => {
    const results: RegRow[] = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on("data", (data) => results.push(data as RegRow))
      .on("end", () => resolve(results))
      .on("error", reject);
  });

export const saveCsv = async (path: string, rows: RegRow[]): Promise<void> => {
  const writer = createObjectCsvWriter({
    path,
    header: [
      { id: "type", title: "type" },
      { id: "installationId", title: "installationId" },
    ],
  });
  await writer.writeRecords(rows);
};
