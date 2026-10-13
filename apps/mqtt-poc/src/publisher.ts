import { ConsumeMessage, connect } from "amqplib";

import { connectClient } from "./adapters/mqtt.js";
import { amqpUrl, certificate, loadPublisherConfig } from "./config.js";
import { eventSchema } from "./domain/event.js";
import { topicFor } from "./domain/policy.js";

export const openPipeline = async () => {
  const config = loadPublisherConfig();
  const url = new URL(amqpUrl);
  url.username = "publisher";
  url.password = config.publisherPassword;
  const connection = await connect(url.toString(), {
    ca: certificate("ca.pem"),
  });
  const channel = await connection.createConfirmChannel();
  await channel.assertExchange("io-poc-errors", "fanout", { durable: true });
  await channel.assertQueue("io-poc-dlq", { durable: true });
  await channel.bindQueue("io-poc-dlq", "io-poc-errors", "");
  await channel.assertQueue("io-poc-ingress", {
    arguments: { "x-dead-letter-exchange": "io-poc-errors" },
    durable: true,
  });
  await channel.assertExchange("io-poc-ingress", "direct", { durable: true });
  await channel.bindQueue("io-poc-ingress", "io-poc-ingress", "event");
  return { channel, connection };
};

export const startPublisher = async () => {
  const pipeline = await openPipeline();
  const publisher = await connectClient({
    clientId: "io-publisher",
    password: loadPublisherConfig().publisherPassword,
    username: "publisher",
  });
  publisher.on("error", () =>
    console.error(JSON.stringify({ event: "publisher-connection-error" })),
  );
  await pipeline.channel.prefetch(20);
  const processEvent = async (message: ConsumeMessage): Promise<void> => {
    const parsed = eventSchema.safeParse(
      (() => {
        try {
          return JSON.parse(message.content.toString());
        } catch {
          return null;
        }
      })(),
    );
    if (!parsed.success) {
      pipeline.channel.reject(message, false);
      console.error(
        JSON.stringify({ event: "internal-dlq", reason: "invalid-schema" }),
      );
      return;
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const packet = await publisher.publishAsync(
          topicFor(parsed.data.serviceId),
          JSON.stringify(parsed.data),
          {
            properties: {
              contentType: "application/json",
              messageExpiryInterval: 900,
            },
            qos: 1,
            retain: false,
          },
        );
        if (
          packet &&
          "reasonCode" in packet &&
          typeof packet.reasonCode === "number" &&
          packet.reasonCode >= 128
        )
          throw new Error("Publish rejected");
        pipeline.channel.ack(message);
        return;
      } catch {
        if (attempt === 2) {
          pipeline.channel.reject(message, false);
          console.error(
            JSON.stringify({
              event: "internal-dlq",
              reason: "publish-retries-exhausted",
            }),
          );
        }
      }
    }
  };
  await pipeline.channel.consume("io-poc-ingress", (message) => {
    if (message)
      void processEvent(message).catch(() => {
        console.error(
          JSON.stringify({
            action: "unacknowledged",
            event: "ingress-processing-error",
          }),
        );
      });
  });
  return async () => {
    await publisher.endAsync();
    await pipeline.connection.close();
  };
};

if (
  process.argv[1]?.endsWith("publisher.js") ||
  process.argv[1]?.endsWith("publisher.ts")
) {
  const stop = await startPublisher();
  console.log(JSON.stringify({ event: "publisher-ready" }));
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => {
      void stop();
    });
}
