import { readFileSync } from "node:fs";
import { connectAsync } from "mqtt";
import z from "zod";

const configuration = z
  .object({
    endpoint: z.url(),
    username: z.string(),
    password: z.string(),
    clientId: z.string(),
    topic: z.string(),
    serviceId: z.string(),
    sessionExpiryInterval: z.number().int().nonnegative().default(3600),
  })
  .parse(
    JSON.parse(
      readFileSync(process.env.MQTT_CONFIG_PATH ?? "consumer.json", "utf8"),
    ),
  );
if (!configuration.endpoint.startsWith("mqtts://"))
  throw new Error("A verified TLS MQTT endpoint is required");
const schema = z
  .object({
    eventId: z.uuid(),
    schemaVersion: z.literal(1),
    eventType: z.enum(["message.status.changed", "message.read.changed"]),
    serviceId: z.string().regex(/^[a-zA-Z0-9-]{1,80}$/),
    messageId: z.ulid(),
    status: z.enum([
      "ACCEPTED",
      "THROTTLED",
      "FAILED",
      "PROCESSED",
      "REJECTED",
    ]),
    isRead: z.boolean(),
    version: z.number().int().nonnegative(),
    occurredAt: z.iso.datetime(),
  })
  .strict();
const client = await connectAsync(configuration.endpoint, {
  ca: readFileSync(process.env.MQTT_CA_PATH ?? "ca.pem"),
  protocolVersion: 5,
  username: configuration.username,
  password: configuration.password,
  clientId: configuration.clientId,
  clean: false,
  reconnectPeriod: 1000,
  resubscribe: false,
  connectTimeout: 10000,
  properties: {
    sessionExpiryInterval: configuration.sessionExpiryInterval,
    receiveMaximum: 20,
  },
});
const subscribe = () => {
  void client
    .subscribeAsync(configuration.topic, { qos: 1 })
    .catch(() => console.error("Subscription rejected"));
};
subscribe();
client.on("connect", subscribe);
client.on("error", () =>
  console.error(
    "MQTT connection error; verify endpoint, credentials and certificate",
  ),
);
const processed = new Map<string, number>();
client.on("message", (topic, payload) => {
  try {
    const event = schema.parse(JSON.parse(payload.toString()));
    if (
      topic !== configuration.topic ||
      event.serviceId !== configuration.serviceId
    ) {
      console.error("Tenant isolation violation; stopping the connection");
      void client.endAsync(true);
      return;
    }
    if (processed.has(event.eventId)) return;
    processed.set(event.eventId, Date.now());
    if (processed.size > 10000)
      processed.delete(processed.keys().next().value!);
    console.log(
      JSON.stringify({
        event: "processed",
        eventId: event.eventId,
        messageId: event.messageId,
        status: event.status,
        isRead: event.isRead,
      }),
    );
  } catch {
    console.error(
      "Invalid event or processing failure; recovery is the consumer application's responsibility",
    );
  }
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    void client.endAsync();
  });
