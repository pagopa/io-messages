# External Service MQTT Integration

## Public Contract

An IO service subscribes only to its own events. Two services belonging to the same organization still need distinct authorized credentials. Obtain a connection bundle using your service's API key through the onboarding endpoint. The MQTT connection uses the returned username/password and assigned clientId, not the IO API key directly.

For this synthetic local PoC, onboarding is `https://localhost:18443/subscriptions` and MQTT is `mqtts://localhost:18883`. These are local demonstration endpoints, not PagoPA production URLs. Required protocol is MQTT 5 over verified TLS, publish/subscription QoS1, JSON schema version 1. Subscribe to the exact assigned topic:

```text
io/v1/services/{serviceId}/messages/status
```

The subscription carries both status and read-change event types. Do not publish, choose another service's topic, use wildcard filters or substitute another client's assigned clientId. An application gets its own session and event copies; shared/load-balanced subscriptions are not offered.

## Prerequisites and Onboarding

- Node.js 24 and npm for the reference example; a standard MQTT 5 SDK for other languages.
- Network access to the supplied TLS endpoint and a trustworthy server CA certificate.
- An operator-enabled service API key. Do not put keys in URLs, source code, logs or version control.

Request a registration with HTTPS, header `x-api-key` and body `{"appId":"notifications"}`. Repeating the request for the same service/appId is idempotent. The API response provides:

```json
{
  "serviceId": "service-A",
  "appId": "notifications",
  "endpoint": "mqtts://localhost:18883",
  "username": "assigned-username",
  "password": "synthetic-placeholder-not-a-real-credential",
  "clientId": "assigned-client-id",
  "topic": "io/v1/services/service-A/messages/status",
  "protocolVersion": 5,
  "qos": 1,
  "sessionExpiryInterval": 3600
}
```

Treat this bundle as a secret. The CA certificate is delivered separately; no CA private key is needed. `GET /subscriptions` lists your own registrations without passwords. Contact the operator for rotation or revocation. Revoked registrations cannot be restored by retrying onboarding; an operator must authorize a new registration.

## Complete TypeScript Consumer

The independent project is [examples/external-consumer](../apps/mqtt-poc/examples/external-consumer/package.json). It installs only public `mqtt`, `zod` and `tsx` dependencies and has no monorepo or RabbitMQ dependency. Place the bundle in a protected `consumer.json` and CA in `ca.pem`, then run `npm install` and `npm start`. Paths can be set using `MQTT_CONFIG_PATH` and `MQTT_CA_PATH`.

```typescript
import { readFileSync } from "node:fs";
import { connectAsync } from "mqtt";
import z from "zod";

const config = z
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
if (!config.endpoint.startsWith("mqtts://")) throw new Error("TLS is required");
const eventSchema = z
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
const client = await connectAsync(config.endpoint, {
  ca: readFileSync(process.env.MQTT_CA_PATH ?? "ca.pem"),
  username: config.username,
  password: config.password,
  clientId: config.clientId,
  protocolVersion: 5,
  clean: false,
  reconnectPeriod: 1000,
  resubscribe: false,
  properties: {
    sessionExpiryInterval: config.sessionExpiryInterval,
    receiveMaximum: 20,
  },
});
const subscribe = () => {
  void client
    .subscribeAsync(config.topic, { qos: 1 })
    .catch(() => console.error("Subscription rejected"));
};
subscribe();
client.on("connect", subscribe);
client.on("error", () =>
  console.error("Connection error; verify endpoint, credentials and CA"),
);
const processed = new Set<string>();
client.on("message", (topic, payload) => {
  try {
    const event = eventSchema.parse(JSON.parse(payload.toString()));
    if (topic !== config.topic || event.serviceId !== config.serviceId) {
      console.error("Isolation violation");
      void client.endAsync(true);
      return;
    }
    if (processed.has(event.eventId)) return;
    processed.add(event.eventId);
    if (processed.size > 10000)
      processed.delete(processed.values().next().value!);
    console.log(
      JSON.stringify({
        event: "processed",
        eventId: event.eventId,
        status: event.status,
        isRead: event.isRead,
      }),
    );
  } catch {
    console.error(
      "Invalid event or processing failure; recovery belongs to this application",
    );
  }
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void client.endAsync();
  });
}
```

The checked reference implementation is [consumer.ts](../apps/mqtt-poc/examples/external-consumer/consumer.ts). Certificate verification stays enabled; never set `rejectUnauthorized: false`. A public event with unexpected fields is rejected, not logged in full.

## Event Schema

The public [JSON Schema](mqtt-poc-event.schema.json) uses `additionalProperties: false`. Example:

```json
{
  "eventId": "5d5e5e65-3924-4016-805e-a8825bc67626",
  "schemaVersion": 1,
  "eventType": "message.status.changed",
  "serviceId": "service-A",
  "messageId": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "status": "PROCESSED",
  "isRead": false,
  "version": 1,
  "occurredAt": "2026-10-13T10:00:00.000Z"
}
```

`eventId` is the retry/deduplication identity. `messageId` identifies the IO message; `version` identifies its state version, not a promise of arrival ordering. The schema contains no citizen identifier, subject, content, payment details or free-text rejection data. `message.read.changed` carries the same fields with the relevant `isRead` value.

## Delivery, Reconnection and Errors

QoS1 is at-least-once **protocol delivery**, not exactly-once processing. PUBACK does not tell PagoPA that your database transaction completed. Use durable application idempotency keyed by eventId and persist an inbox/processing result if restart-safe recovery is needed. The sample's 10000-entry memory cache is illustrative and lost on restart.

Reconnect with the same assigned clientId, `clean=false` and the negotiated session expiry. Inspect CONNACK `Session Present`; if the session is gone, subscribe again. The sample resubscribes to the exact topic on reconnect, which is safe with retained delivery disabled. Sample retry is fixed at 1s; production reconnect needs backoff/jitter and limits. Rotated credentials must be reloaded and the client reconnected; repeated authentication failures require operator intervention.

Only events published after a successful subscription are eligible for offline accumulation. Session expiry, message expiry and bounded backlog can remove events; there is no historical replay. Defaults are 1h session expiry and 15min forwarded-event expiry in this PoC, not approved production retention.

Handle invalid payloads, processing errors and poison messages inside your own application. Your DLQ/inbox and retries are your responsibility. PagoPA's internal DLQ handles its own validation/forwarding failures, not failures after your PUBACK. No business acknowledgement endpoint is offered by this PoC.

Common failures: untrusted/expired certificate or incorrect hostname; wrong/rotated/revoked credentials; unassigned clientId; wildcard/cross-service topic; unknown schema version; session already expired. The local CA lasts 30 days. Do not reuse a clientId across concurrently running instances; register separate consumers for independent copies.

## Java Integration Excerpt

HiveMQ's standard MQTT 5 client is an alternative, independent of the broker. Add `com.hivemq:hivemq-mqtt-client` using a version validated by your application. This excerpt illustrates transport/subscription only; use the public JSON Schema, durable idempotency and processing-error handling as in the reference contract. It was not compiled or executed in this session.

```java
import com.hivemq.client.mqtt.mqtt5.Mqtt5Client;
import com.hivemq.client.mqtt.datatypes.MqttQos;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.TrustManagerFactory;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.util.concurrent.CountDownLatch;

public class ConsumerExample {
  public static void main(String[] args) throws Exception {
    KeyStore trusted = KeyStore.getInstance(KeyStore.getDefaultType());
    trusted.load(null, null);
    try (var certificate = Files.newInputStream(Path.of(System.getenv("MQTT_CA_PATH")))) {
      trusted.setCertificateEntry("io-ca", CertificateFactory.getInstance("X.509").generateCertificate(certificate));
    }
    TrustManagerFactory trust = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
    trust.init(trusted);
    var client = Mqtt5Client.builder()
        .identifier(System.getenv("MQTT_CLIENT_ID"))
        .serverHost(System.getenv("MQTT_HOST"))
        .serverPort(Integer.parseInt(System.getenv("MQTT_PORT")))
        .sslConfig().trustManagerFactory(trust)
        .hostnameVerifier(HttpsURLConnection.getDefaultHostnameVerifier()).applySslConfig()
        .automaticReconnectWithDefaultConfig().buildAsync();
    client.connectWith().cleanStart(false).sessionExpiryInterval(3600)
        .simpleAuth().username(System.getenv("MQTT_USERNAME"))
        .password(System.getenv("MQTT_PASSWORD").getBytes(StandardCharsets.UTF_8))
        .applySimpleAuth().send().join();
    client.subscribeWith().topicFilter(System.getenv("MQTT_TOPIC"))
        .qos(MqttQos.AT_LEAST_ONCE)
        .callback(publish -> System.out.println("Received event bytes: " + publish.getPayloadAsBytes().length))
        .send().join();
    Runtime.getRuntime().addShutdownHook(new Thread(() -> client.disconnect().join()));
    new CountDownLatch(1).await();
  }
}
```

Do not log production passwords or raw payloads. Persisted session recovery after expiry, schema validation and error recovery remain required additions to this Java excerpt.

## Local DX Demonstration

1. An operator enables synthetic A/B/C. A and B remain isolated even if the same organization owns both.
2. Run `pnpm --filter mqtt-poc demo` from the repository root to call the API and obtain A's bundle.
3. Copy the independent example outside the monorepo; install its three public dependencies.
4. Configure two file paths: connection bundle and public CA; credentials are not embedded in source.
5. Start the consumer with `npm start`.
6. Run `pnpm --filter mqtt-poc demo --publish`; observe A's synthetic event.
7. Run `pnpm --filter mqtt-poc test:integration`; observe explicit denial of B/C topics, wildcard attempts and clientId impersonation.

`test:dx` automates independent installation, subscription, valid ingress delivery and graceful shutdown. Integration has approximately five manual setup/start/publish actions after operator enablement, two file-path settings, and a bundle containing endpoint, username/password, clientId, serviceId, exact topic and session parameter. Main difficulties are CA trust, credential rotation, stable clientId ownership and durable idempotency, not broker topology.
