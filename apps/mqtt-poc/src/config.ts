import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import z from "zod";

export const stateDir = resolve(process.env.POC_STATE_DIR ?? "local");
export const configSchema = z.object({
  adminKey: z.string().min(32),
  adminPassword: z.string().min(32),
  publisherPassword: z.string().min(32),
  services: z.array(
    z.object({ apiKeyHash: z.string(), serviceId: z.string() }),
  ),
});
export const loadConfig = () =>
  configSchema.parse(
    JSON.parse(readFileSync(resolve(stateDir, "config.json"), "utf8")),
  );
export const certificate = (name: string): Buffer =>
  readFileSync(resolve(stateDir, "certs", name));
export const loadPublisherConfig = (): { publisherPassword: string } =>
  z
    .object({ publisherPassword: z.string().min(32) })
    .parse(
      JSON.parse(readFileSync(resolve(stateDir, "publisher.json"), "utf8")),
    );
export const brokerUrl =
  process.env.POC_BROKER_URL ?? "https://localhost:15681";
export const mqttUrl = process.env.POC_MQTT_URL ?? "mqtts://localhost:18883";
export const apiUrl = process.env.POC_API_URL ?? "https://localhost:18443";
export const amqpUrl =
  process.env.POC_AMQP_URL ?? "amqps://localhost:15682/io-mqtt-poc";
