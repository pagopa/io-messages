import csv from "csv-parser";
import dotenv from "dotenv";
import fs, { createReadStream } from "fs";
import path from "path";
import readline from "readline";

import { RegRow } from "../notification-hub/types";

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

export const readTxt = async (path: string): Promise<string[]> => {
  const ids = new Set<string>();
  const re = /\$InstallationId:\{([^}]+)\}/g;

  const rl = readline.createInterface({
    input: createReadStream(path, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    let m;
    while ((m = re.exec(line)) !== null) ids.add(m[1]);
  }

  return [...ids];
};
