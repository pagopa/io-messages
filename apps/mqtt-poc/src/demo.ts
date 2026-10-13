import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { jsonRequest } from "./adapters/http.js";
import { apiUrl, stateDir } from "./config.js";
import { syntheticEvent } from "./domain/event.js";
import { openPipeline } from "./publisher.js";

const services = JSON.parse(
  readFileSync(resolve(stateDir, "services.json"), "utf8"),
) as { apiKey: string; serviceId: string }[];
if (process.argv.includes("--publish")) {
  const pipeline = await openPipeline();
  pipeline.channel.publish(
    "io-poc-ingress",
    "event",
    Buffer.from(JSON.stringify(syntheticEvent(services[0].serviceId))),
    { persistent: true },
  );
  await pipeline.channel.waitForConfirms();
  await pipeline.connection.close();
  console.log("Synthetic event accepted into the private ingress queue.");
} else {
  const details = await jsonRequest(
    `${apiUrl}/subscriptions`,
    "POST",
    { appId: "external-demo" },
    { "x-api-key": services[0].apiKey },
  );
  writeFileSync(resolve(stateDir, "consumer.json"), JSON.stringify(details), {
    mode: 0o600,
  });
  console.log(
    "Onboarding API response stored in local/consumer.json. Credentials not printed.",
  );
}
