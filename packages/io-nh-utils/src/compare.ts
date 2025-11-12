#!/usr/bin/env ts-node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { createObjectCsvWriter as createCsvWriter } from "csv-writer";

type Row = {
  installationId: string;
  platform: string;
  pushChannel: string;
  // Keep any extra columns too
  [key: string]: string;
};

type RowMap = Map<string, Row>;

const REQUIRED_HEADERS = ["installationId", "platform", "pushChannel"] as const;

function validateHeaders(row: any, sourceName: string) {
  for (const h of REQUIRED_HEADERS) {
    if (!(h in row)) {
      throw new Error(
        `Missing required header "${h}" in ${sourceName}. Found headers: ${Object.keys(
          row,
        ).join(", ")}`,
      );
    }
  }
}

function normalize(row: any): Row {
  // Trim strings and coerce to string
  const out: Row = {
    installationId: String(row.installationId ?? "").trim(),
    platform: String(row.platform ?? "").trim(),
    pushChannel: String(row.pushChannel ?? "").trim(),
  };
  // Preserve any extra columns
  for (const [k, v] of Object.entries(row)) {
    if (!(k in out)) {
      (out as any)[k] = typeof v === "string" ? v.trim() : String(v ?? "");
    }
  }
  return out;
}

async function readCsvToMap(filePath: string, label: string): Promise<RowMap> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return new Promise<RowMap>((resolve, reject) => {
    const map: RowMap = new Map();
    let validated = false;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("headers", (headers: string[]) => {
        // minimal early validation once we see headers via the first row later
      })
      .on("data", (row: any) => {
        try {
          if (!validated) {
            validateHeaders(row, label);
            validated = true;
          }
          const n = normalize(row);
          if (!n.installationId) {
            // Skip empty installationId rows but do not crash
            return;
          }
          // If duplicates: keep the LAST occurrence (common when files have updates appended)
          map.set(n.installationId, n);
        } catch (err) {
          reject(err);
        }
      })
      .on("end", () => resolve(map))
      .on("error", (err: any) => reject(err));
  });
}

function outBaseFrom(filePath: string): string {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  return path.join(dir, base);
}

async function writeCsv(
  filePath: string,
  records: any[],
  headers: { id: string; title: string }[],
) {
  if (records.length === 0) {
    // Ensure we still create an empty file with headers so it’s obvious nothing matched
    const writer = createCsvWriter({ path: filePath, header: headers });
    await writer.writeRecords([]);
    return;
  }
  const writer = createCsvWriter({ path: filePath, header: headers });
  await writer.writeRecords(records);
}

async function main() {
  const program = new Command();
  program
    .name("compare")
    .description(
      "Compare two CSVs with headers: installationId, platform, pushChannel",
    )
    .requiredOption("-w, --with <file>", "Path to file1 (the baseline)")
    .requiredOption("-i, --input <file>", "Path to file2 (the comparison)")
    .parse(process.argv);

  const opts = program.opts<{ with: string; input: string }>();
  const file1 = opts.with;
  const file2 = opts.input;

  const [map1, map2] = await Promise.all([
    readCsvToMap(file1, "file1"),
    readCsvToMap(file2, "file2"),
  ]);

  // 1) In file1 but not in file2
  const onlyIn1: Row[] = [];
  for (const [id, row] of map1) {
    if (!map2.has(id)) onlyIn1.push(row);
  }

  // 2) In file2 but not in file1
  const onlyIn2: Row[] = [];
  for (const [id, row] of map2) {
    if (!map1.has(id)) onlyIn2.push(row);
  }

  // 3) Same installationId, different pushChannel
  type DiffRow = {
    installationId: string;
    platform: string;
    pushChannel: string;
  };
  const diffs: DiffRow[] = [];
  for (const [id, r1] of map1) {
    const r2 = map2.get(id);
    if (r2 && r1.pushChannel !== r2.pushChannel) {
      diffs.push({
        installationId: id,
        platform: r1.platform,
        pushChannel: r1.pushChannel,
      });
    }
  }

  const baseOut = outBaseFrom(file1);
  const outComparison1 = `${baseOut}-comparison1.csv`; // in file1 not in file2
  const outComparison2 = `${baseOut}-comparison2.csv`; // in file2 not in file1
  const outDiff = `${baseOut}-diff.csv`; // same id, different pushChannel

  // Headers
  const baseHeaders = [
    { id: "installationId", title: "installationId" },
    { id: "platform", title: "platform" },
    { id: "pushChannel", title: "pushChannel" },
  ];

  const diffHeaders = [
    { id: "installationId", title: "installationId" },
    { id: "platform", title: "platform" },
    { id: "pushChannel", title: "pushChannel" },
  ];

  // Write out
  await writeCsv(outComparison1, onlyIn1, baseHeaders);
  await writeCsv(outComparison2, onlyIn2, baseHeaders);
  await writeCsv(outDiff, diffs, diffHeaders);

  // Simple summary
  const fmt = (n: number) => n.toLocaleString();
  console.log(`✅ Done!
- Read: ${file1} (${fmt(map1.size)} unique installationIds)
- Read: ${file2} (${fmt(map2.size)} unique installationIds)
- Wrote: ${outComparison1} (${fmt(onlyIn1.length)} rows)
- Wrote: ${outComparison2} (${fmt(onlyIn2.length)} rows)
- Wrote: ${outDiff} (${fmt(diffs.length)} rows with differing pushChannel)
`);
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});
