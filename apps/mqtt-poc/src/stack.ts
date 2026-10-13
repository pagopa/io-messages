import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve("../..");
const model = JSON.parse(
  execFileSync(
    "docker",
    [
      "compose",
      "--profile",
      "mqtt-poc",
      "config",
      "--no-env-resolution",
      "--format",
      "json",
    ],
    { cwd: root, encoding: "utf8" },
  ),
) as {
  networks: Record<string, unknown>;
  services: Record<string, { profiles?: string[] }>;
  volumes: Record<string, unknown>;
};
model.services = Object.fromEntries(
  Object.entries(model.services).filter(([, service]) =>
    service.profiles?.includes("mqtt-poc"),
  ),
);
model.networks = Object.fromEntries(
  Object.entries(model.networks).filter(([name]) => name === "mqtt-poc"),
);
model.volumes = Object.fromEntries(
  Object.entries(model.volumes).filter(([name]) =>
    name.startsWith("mqtt-poc-"),
  ),
);
const command = process.argv[2] ?? "up";
if (!["stop", "up"].includes(command))
  throw new Error(
    "Only up and stop are supported; other repository services must not be changed",
  );
const argumentsList =
  command === "up"
    ? ["up", "-d", "--build", "--wait", "--wait-timeout", "90"]
    : ["stop"];
execFileSync(
  "docker",
  ["compose", "-f", "-", "--profile", "mqtt-poc", ...argumentsList],
  {
    cwd: root,
    input: JSON.stringify(model),
    stdio: ["pipe", "inherit", "inherit"],
  },
);
