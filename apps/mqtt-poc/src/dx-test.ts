import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { Broker } from "./adapters/broker.js";
import { jsonRequest } from "./adapters/http.js";
import { ConsumerDetails } from "./adapters/mqtt.js";
import { apiUrl, loadConfig, stateDir } from "./config.js";
import { syntheticEvent } from "./domain/event.js";
import { openPipeline } from "./publisher.js";

const service = (
  JSON.parse(readFileSync(resolve(stateDir, "services.json"), "utf8")) as {
    apiKey: string;
  }[]
)[0];
const details = await jsonRequest<ConsumerDetails>(
  `${apiUrl}/subscriptions`,
  "POST",
  { appId: `dx-${Date.now()}` },
  { "x-api-key": service.apiKey },
);
const directory = mkdtempSync(resolve(tmpdir(), "io-mqtt-external-"));
try {
  cpSync("examples/external-consumer", directory, {
    filter: (path) => !path.includes("node_modules"),
    recursive: true,
  });
  writeFileSync(resolve(directory, "consumer.json"), JSON.stringify(details), {
    mode: 0o600,
  });
  cpSync(resolve(stateDir, "certs/ca.pem"), resolve(directory, "ca.pem"));
  execFileSync(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: directory, stdio: "ignore" },
  );
  const child = spawn(process.execPath, ["--import", "tsx", "consumer.ts"], {
    cwd: directory,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let errors = "";
  child.stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk: Buffer) => {
    errors += chunk.toString();
  });
  try {
    let subscribed = false;
    for (let attempt = 0; attempt < 50 && !subscribed; attempt++) {
      try {
        const bindings = await new Broker().request<unknown[]>(
          `/queues/io-mqtt-poc/mqtt-subscription-${details.clientId}qos1/bindings`,
        );
        subscribed = bindings.length > 1;
      } catch {
        subscribed = false;
      }
      if (!subscribed) await delay(100);
    }
    assert.equal(subscribed, true, "Standalone consumer did not subscribe");
    const pipeline = await openPipeline();
    const event = syntheticEvent(details.serviceId);
    pipeline.channel.publish(
      "io-poc-ingress",
      "event",
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );
    await pipeline.channel.waitForConfirms();
    await pipeline.connection.close();
    for (
      let attempt = 0;
      attempt < 50 && !output.includes(event.eventId);
      attempt++
    )
      await delay(100);
    assert.ok(
      output.includes(event.eventId),
      "Standalone consumer did not process its event",
    );
    assert.equal(errors, "");
  } finally {
    const stopped = new Promise<void>((resolveStopped) =>
      child.once("exit", () => resolveStopped()),
    );
    child.kill("SIGTERM");
    await stopped;
  }
} finally {
  await jsonRequest(
    `${apiUrl}/admin/subscriptions/${details.username}`,
    "DELETE",
    undefined,
    { "x-admin-key": loadConfig().adminKey },
  );
  rmSync(directory, { recursive: true });
}
process.stdout.write(
  "Standalone installation, verified TLS, subscription, ingress delivery and shutdown passed.\n",
);
