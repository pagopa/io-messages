import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { stateDir } from "./config.js";
import { secretHash } from "./domain/policy.js";

mkdirSync(resolve(stateDir, "certs"), { mode: 0o700, recursive: true });
if (existsSync(resolve(stateDir, "config.json")))
  throw new Error(
    "Local state already exists; keep it or remove only the PoC local directory explicitly before reinitializing",
  );
const certDir = resolve(stateDir, "certs");
execFileSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    "ca.key",
    "-out",
    "ca.pem",
    "-days",
    "30",
    "-subj",
    "/CN=IO MQTT PoC Synthetic CA",
  ],
  { cwd: certDir, stdio: "ignore" },
);
for (const [name, dns] of [
  ["broker", "rabbitmq-mqtt"],
  ["api", "mqtt-onboarding"],
]) {
  writeFileSync(
    resolve(certDir, `${name}.ext`),
    `subjectAltName=DNS:localhost,DNS:${dns},IP:127.0.0.1\nextendedKeyUsage=serverAuth,clientAuth\nbasicConstraints=CA:FALSE\n`,
  );
  execFileSync(
    "openssl",
    [
      "req",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      `${name}.key`,
      "-out",
      `${name}.csr`,
      "-subj",
      `/CN=${dns}`,
    ],
    { cwd: certDir, stdio: "ignore" },
  );
  execFileSync(
    "openssl",
    [
      "x509",
      "-req",
      "-in",
      `${name}.csr`,
      "-CA",
      "ca.pem",
      "-CAkey",
      "ca.key",
      "-CAcreateserial",
      "-out",
      `${name}.pem`,
      "-days",
      "30",
      "-extfile",
      `${name}.ext`,
    ],
    { cwd: certDir, stdio: "ignore" },
  );
}
const adminPassword = randomBytes(32).toString("hex");
const publisherPassword = randomBytes(32).toString("hex");
writeFileSync(
  resolve(stateDir, "publisher.json"),
  JSON.stringify({ publisherPassword }),
  { mode: 0o600 },
);
const services = ["service-A", "service-B", "service-C"].map((serviceId) => ({
  apiKey: randomBytes(32).toString("hex"),
  serviceId,
}));
writeFileSync(
  resolve(stateDir, "config.json"),
  JSON.stringify({
    adminKey: randomBytes(32).toString("hex"),
    adminPassword,
    publisherPassword,
    services: services.map(({ apiKey, serviceId }) => ({
      apiKeyHash: secretHash(apiKey),
      serviceId,
    })),
  }),
  { mode: 0o600 },
);
writeFileSync(resolve(stateDir, "services.json"), JSON.stringify(services), {
  mode: 0o600,
});
const rabbitHash = (password: string) => {
  const salt = randomBytes(4);
  return Buffer.concat([
    salt,
    createHash("sha256").update(salt).update(password).digest(),
  ]).toString("base64");
};
writeFileSync(
  resolve(stateDir, "definitions.json"),
  JSON.stringify({
    permissions: [
      {
        configure: ".*",
        read: ".*",
        user: "operator",
        vhost: "io-mqtt-poc",
        write: ".*",
      },
      {
        configure: "^io-poc-.*$",
        read: "^io-poc-.*$",
        user: "publisher",
        vhost: "io-mqtt-poc",
        write: "^(amq\\.topic|io-poc-.*)$",
      },
    ],
    policies: [
      {
        "apply-to": "queues",
        definition: {
          "dead-letter-exchange": "io-poc-errors",
          "max-length": 1000,
          "max-length-bytes": 16777216,
          overflow: "drop-head",
        },
        name: "bounded-sessions",
        pattern: "^mqtt-subscription-",
        priority: 0,
        vhost: "io-mqtt-poc",
      },
    ],
    topic_permissions: [
      {
        exchange: "amq.topic",
        read: "^$",
        user: "publisher",
        vhost: "io-mqtt-poc",
        write:
          "^io\\.v1\\.services\\.[a-zA-Z0-9-]+\\.messages\\.status(\\.bench\\.[a-zA-Z0-9-]+)?$",
      },
    ],
    users: [
      {
        hashing_algorithm: "rabbit_password_hashing_sha256",
        name: "operator",
        password_hash: rabbitHash(adminPassword),
        tags: "administrator",
      },
      {
        hashing_algorithm: "rabbit_password_hashing_sha256",
        name: "publisher",
        password_hash: rabbitHash(publisherPassword),
        tags: "",
      },
    ],
    vhosts: [{ name: "io-mqtt-poc" }],
  }),
  { mode: 0o600 },
);
console.log(
  "Synthetic state created in local/. No credentials have been printed. Certificates expire in 30 days.",
);
