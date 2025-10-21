#!/usr/bin/env ts-node

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import { createReadStream, createWriteStream } from "node:fs";
import { Command } from "commander";
import { XMLParser } from "fast-xml-parser";
import crypto from "node:crypto";

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function extractRecords(
  buffer: string,
  elementName: string,
): { records: string[]; rest: string } {
  const records: string[] = [];
  const startRe = new RegExp(`<${elementName}(\\s[^>]*)?>`, "i");
  const endTag = `</${elementName}>`;
  let startIdx = buffer.search(startRe);
  while (startIdx !== -1) {
    const startMatch = buffer.match(startRe);
    if (!startMatch || startMatch.index === undefined) break;
    const startTag = startMatch[0];
    const openIdx = startMatch.index;
    let from = openIdx + startTag.length;
    let depth = 1;
    while (depth > 0) {
      const nextOpen = buffer.slice(from).search(startRe);
      const nextClose = buffer.indexOf(endTag, from);
      if (nextClose === -1) return { records, rest: buffer.slice(openIdx) };
      if (nextOpen !== -1) {
        const absOpen = from + nextOpen;
        if (absOpen < nextClose) {
          depth++;
          from =
            absOpen + (buffer.slice(absOpen).match(startRe)?.[0].length ?? 0);
          continue;
        }
      }
      depth--;
      from = nextClose + endTag.length;
    }
    records.push(buffer.slice(openIdx, from));
    buffer = buffer.slice(from);
    startIdx = buffer.search(startRe);
  }
  return { records, rest: buffer };
}

async function splitAndProcess(
  inputPath: string,
  outDir: string,
  elementName: string,
  recordsPerFile: number,
): Promise<string[]> {
  await fs.promises.mkdir(outDir, { recursive: true });
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    processEntities: true,
  });

  let buf = "";
  let recCount = 0;
  let fileIndex = 0;
  const csvPaths: string[] = [];

  const makeCsvPath = () =>
    path.join(outDir, `chunk-${String(fileIndex).padStart(5, "0")}.csv`);
  let currentCsv = createWriteStream(makeCsvPath());
  currentCsv.write("installationId,platform,pushChannel\n");
  csvPaths.push(makeCsvPath());
  log(`Started writing ${makeCsvPath()}`);

  const rs = createReadStream(inputPath, {
    encoding: "utf8",
    highWaterMark: 1024 * 1024,
  });

  await new Promise<void>((resolve, reject) => {
    rs.on("data", (chunk: string) => {
      buf += chunk;
      const { records, rest } = extractRecords(buf, elementName);
      buf = rest;
      for (const rec of records) {
        try {
          const obj = parser.parse(rec);
          const node = obj?.[elementName];
          const platform: string | undefined =
            node?.["i:type"] || node?.type || undefined;
          const pushChannel: string | undefined =
            node?.["DeviceToken"] || node?.DeviceToken || undefined;
          const tags: string | undefined = node?.Tags ?? undefined;
          let installationId: string | undefined;
          if (typeof tags === "string") {
            const m = /\$InstallationId:\{([^}]+)\}/.exec(tags);
            installationId = m?.[1];
          }
          if (installationId && platform && pushChannel) {
            currentCsv.write(`${installationId},${platform},${pushChannel}\n`);
            recCount++;
            if (recCount % 100000 === 0)
              log(`Processed ${recCount} records so far...`);
            if (recCount >= recordsPerFile) {
              currentCsv.end();
              log(`Finished ${makeCsvPath()}`);
              fileIndex++;
              recCount = 0;
              const nextPath = makeCsvPath();
              currentCsv = createWriteStream(nextPath);
              currentCsv.write("installationId,platform,pushChannel\n");
              csvPaths.push(nextPath);
              log(`Started writing ${nextPath}`);
            }
          }
        } catch {}
      }
    });
    rs.on("error", reject);
    rs.on("end", () => resolve());
  });

  await new Promise((r) => currentCsv.end(r));
  log(`Splitting complete — ${csvPaths.length} chunk(s) created`);
  return csvPaths.filter((p) => fs.existsSync(p));
}

function bucketIndex(id: string, buckets: number): number {
  const h = crypto.createHash("md5").update(id).digest();
  return h.readUInt32BE(0) % buckets;
}

async function bucketize(
  csvPaths: string[],
  tmpDir: string,
  buckets: number,
): Promise<string[]> {
  log(`Bucketing ${csvPaths.length} CSVs into ${buckets} temporary files...`);
  await fs.promises.mkdir(tmpDir, { recursive: true });
  const bucketFiles = Array.from({ length: buckets }, (_, i) =>
    path.join(tmpDir, `bucket-${i}.csv`),
  );
  const writers: Array<fs.WriteStream | null> = Array.from(
    { length: buckets },
    () => null,
  );

  try {
    for (const csvPath of csvPaths) {
      log(`Reading ${csvPath}`);
      const rl = readline.createInterface({
        input: createReadStream(csvPath, { encoding: "utf8" }),
        crlfDelay: Infinity,
      });
      let isFirst = true;
      for await (const line of rl) {
        if (isFirst) {
          isFirst = false;
          if (line.startsWith("installationId")) continue;
        }
        if (!line.trim()) continue;
        const id = line.split(",", 2)[0];
        if (!id) continue;
        const idx = bucketIndex(id, buckets);
        if (!writers[idx])
          writers[idx] = createWriteStream(bucketFiles[idx], { flags: "a" });
        writers[idx]!.write(line + os.EOL);
      }
    }
  } finally {
    await Promise.all(
      writers
        .filter(Boolean)
        .map((w) => new Promise<void>((r) => (w as fs.WriteStream).end(r))),
    );
  }

  log(`Bucketing complete.`);
  return bucketFiles.filter((f) => fs.existsSync(f));
}

async function dedupeBucket(bucket: string, out: fs.WriteStream) {
  const seen = new Set<string>();
  let count = 0;
  const rl = readline.createInterface({
    input: createReadStream(bucket, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const [id, platform, pushChannel] = line.split(",", 3);
    if (!id || !platform || !pushChannel) continue;
    if (!seen.has(id)) {
      seen.add(id);
      out.write(`${id},${platform},${pushChannel}\n`);
      count++;
    }
  }
  log(`Dedupe for ${path.basename(bucket)} → kept ${count} unique rows`);
}

async function mergeDedup(csvPaths: string[], outCsv: string, buckets = 1024) {
  const tmpDir = path.join(path.dirname(outCsv), ".buckets");
  const bucketFiles = await bucketize(csvPaths, tmpDir, buckets);

  const out = createWriteStream(outCsv);
  out.write("installationId,platform,pushChannel\n");
  for (const b of bucketFiles) await dedupeBucket(b, out);
  out.end();
  log(`Merge complete → ${outCsv}`);
}

async function main() {
  const program = new Command();
  program
    .argument("<source>")
    .requiredOption("-o, --out-dir <dir>", "Output directory for chunks")
    .option(
      "-e, --element-name <name>",
      "XML element name",
      "RegistrationDescription",
    )
    .option("-n, --records-per-file <num>", "records per split file", "200000")
    .option("-m, --merged <path>", "Final merged CSV", "./merged.csv")
    .option("-b, --buckets <num>", "Buckets for dedupe", "1024")
    .action(async (source, opts) => {
      log(`Starting split + process of ${source}`);
      const csvChunks = await splitAndProcess(
        source,
        opts.outDir,
        opts.elementName,
        Number(opts.recordsPerFile),
      );
      log(`Starting deduplication/merge of ${csvChunks.length} chunk(s)`);
      await mergeDedup(csvChunks, opts.merged, Number(opts.buckets));
      log(`Done — merged file ready at ${opts.merged}`);
    });

  await program.parseAsync(process.argv);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
