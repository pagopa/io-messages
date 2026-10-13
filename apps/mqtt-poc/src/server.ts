import fastify from "fastify";
import { X509Certificate } from "node:crypto";
import { renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { TLSSocket } from "node:tls";
import z from "zod";

import { Broker } from "./adapters/broker.js";
import { Registry, connectionDetails } from "./application/registry.js";
import { certificate, loadConfig, stateDir } from "./config.js";
import {
  authenticateConsumer,
  identifierSchema,
  matchesSecret,
  secretHash,
} from "./domain/policy.js";

const config = loadConfig();
const registry = new Registry(new Broker());
const tls = { cert: certificate("api.pem"), key: certificate("api.key") };
const api = fastify({ bodyLimit: 16384, https: tls, logger: false });
const callbacks = fastify({
  https: {
    ...tls,
    ca: certificate("ca.pem"),
    rejectUnauthorized: true,
    requestCert: true,
  },
  logger: false,
});
const brokerFingerprint = new X509Certificate(certificate("broker.pem"))
  .fingerprint256;
callbacks.addHook("onRequest", async (request, reply) => {
  if (
    (request.raw.socket as TLSSocket).getPeerCertificate().fingerprint256 !==
    brokerFingerprint
  ) {
    await reply.code(403).send("deny");
  }
});
callbacks.addContentTypeParser(
  "application/x-www-form-urlencoded",
  { parseAs: "string" },
  (_request, body, done) => {
    done(null, Object.fromEntries(new URLSearchParams(String(body))));
  },
);
callbacks.post("/auth/user", async (request) => {
  const body = z
    .object({
      client_id: z.string().optional(),
      password: z.string().default(""),
      username: z.string(),
      vhost: z.string().optional(),
    })
    .parse(request.body);
  if (
    body.username === "operator" &&
    body.client_id === undefined &&
    matchesSecret(body.password, secretHash(config.adminPassword))
  )
    return "allow administrator";
  if (
    body.username === "publisher" &&
    matchesSecret(body.password, secretHash(config.publisherPassword)) &&
    (body.client_id === undefined ||
      (/^io-publisher(-[a-zA-Z0-9-]+)?$/.test(body.client_id) &&
        body.vhost === "io-mqtt-poc"))
  )
    return "allow";
  const allowed = authenticateConsumer(registry.find(body.username), {
    clientId: body.client_id,
    password: body.password,
    username: body.username,
    vhost: body.vhost,
  });
  console.log(
    JSON.stringify({ allowed, event: "authentication", role: "consumer" }),
  );
  return allowed ? "allow" : "deny";
});
api.get("/health", async () => ({ status: "ok" }));
api.post("/subscriptions", async (request, reply) => {
  const key = request.headers["x-api-key"];
  const service =
    typeof key === "string"
      ? config.services.find((entry) => matchesSecret(key, entry.apiKeyHash))
      : undefined;
  if (!service)
    return reply.code(401).send({ error: "Invalid service API key" });
  const body = z
    .object({ appId: identifierSchema })
    .strict()
    .parse(request.body);
  const registration = await registry.onboard(service.serviceId, body.appId);
  console.log(
    JSON.stringify({
      event: "onboarding",
      serviceId: service.serviceId,
      state: registration.state,
    }),
  );
  return connectionDetails(registration);
});
api.addHook("onRequest", async (request, reply) => {
  if (!request.url.startsWith("/admin/")) return;
  const key = request.headers["x-admin-key"];
  if (
    typeof key !== "string" ||
    !matchesSecret(key, secretHash(config.adminKey))
  )
    await reply.code(401).send({ error: "Unauthorized" });
});
api.post("/admin/services", async (request, reply) => {
  const body = z
    .object({
      apiKey: z.string().min(32).max(128),
      serviceId: identifierSchema,
    })
    .strict()
    .parse(request.body);
  const existing = config.services.find(
    (service) => service.serviceId === body.serviceId,
  );
  const keyOwner = config.services.find((service) =>
    matchesSecret(body.apiKey, service.apiKeyHash),
  );
  if (keyOwner && keyOwner.serviceId !== body.serviceId)
    return reply.code(409).send({ error: "Service keys must be unique" });
  if (existing && !matchesSecret(body.apiKey, existing.apiKeyHash))
    return reply
      .code(409)
      .send({ error: "Service already enabled with another key" });
  if (!existing) {
    config.services.push({
      apiKeyHash: secretHash(body.apiKey),
      serviceId: body.serviceId,
    });
    const file = resolve(stateDir, "config.json");
    writeFileSync(`${file}.tmp`, JSON.stringify(config), { mode: 0o600 });
    renameSync(`${file}.tmp`, file);
  }
  console.log(
    JSON.stringify({ event: "service-enabled", serviceId: body.serviceId }),
  );
  return { enabled: true, serviceId: body.serviceId };
});
api.get("/subscriptions", async (request, reply) => {
  const key = request.headers["x-api-key"];
  const service =
    typeof key === "string"
      ? config.services.find((entry) => matchesSecret(key, entry.apiKeyHash))
      : undefined;
  if (!service)
    return reply.code(401).send({ error: "Invalid service API key" });
  return registry
    .all()
    .filter((registration) => registration.serviceId === service.serviceId)
    .map((registration) => ({
      appId: registration.appId,
      clientId: registration.clientId,
      state: registration.state,
      topic: `io/v1/services/${service.serviceId}/messages/status`,
    }));
});
api.delete<{ Params: { serviceId: string } }>(
  "/admin/services/:serviceId",
  async (request) => {
    const serviceId = identifierSchema.parse(request.params.serviceId);
    config.services = config.services.filter(
      (service) => service.serviceId !== serviceId,
    );
    const file = resolve(stateDir, "config.json");
    writeFileSync(`${file}.tmp`, JSON.stringify(config), { mode: 0o600 });
    renameSync(`${file}.tmp`, file);
    for (const registration of registry
      .all()
      .filter(
        (entry) => entry.serviceId === serviceId && entry.state !== "revoked",
      ))
      await registry.revoke(registration.username);
    return { enabled: false, serviceId };
  },
);
api.delete<{ Params: { username: string } }>(
  "/admin/subscriptions/:username",
  async (request) => {
    await registry.revoke(request.params.username);
    console.log(
      JSON.stringify({
        event: "revocation",
        username: request.params.username,
      }),
    );
    return { state: "revoked" };
  },
);
api.put<{ Params: { username: string } }>(
  "/admin/subscriptions/:username/credentials",
  async (request) =>
    connectionDetails(await registry.rotate(request.params.username)),
);
api.setErrorHandler((error, _request, reply) => {
  console.error(
    JSON.stringify({
      event: "api-error",
      type: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  void reply
    .code(error instanceof z.ZodError ? 400 : 503)
    .send({ error: "Request could not be completed" });
});
await callbacks.listen({ host: "0.0.0.0", port: 8444 });
await api.listen({ host: "0.0.0.0", port: 8443 });
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    void Promise.all([api.close(), callbacks.close()]);
  });
