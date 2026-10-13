import { createHash, timingSafeEqual } from "node:crypto";
import z from "zod";

export const identifierSchema = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/);
export const topicFor = (serviceId: string): string =>
  `io/v1/services/${identifierSchema.parse(serviceId)}/messages/status`;

export const secretHash = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export const matchesSecret = (value: string, hash: string): boolean =>
  /^[a-f0-9]{64}$/.test(hash) &&
  timingSafeEqual(
    Buffer.from(secretHash(value), "hex"),
    Buffer.from(hash, "hex"),
  );

export const permissionsFor = (clientId: string) => {
  const queue = `mqtt-subscription-${identifierSchema.parse(clientId)}qos[01]`;
  return {
    configure: `^${queue}$`,
    read: `^(amq\\.topic|${queue})$`,
    write: `^${queue}$`,
  };
};

export const topicPermissionsFor = (serviceId: string) => ({
  exchange: "amq.topic",
  read: `^${topicFor(serviceId).replaceAll("/", "\\.")}(\\.bench\\.[a-zA-Z0-9-]+)?$`,
  write: "^$",
});

export interface Identity {
  clientId: string;
  passwordHash: string;
  state: "active" | "pending" | "revoked" | "revoking";
  username: string;
}

export const authenticateConsumer = (
  identity: Identity | undefined,
  credentials: {
    clientId?: string;
    password: string;
    username: string;
    vhost?: string;
  },
): boolean =>
  identity?.state === "active" &&
  credentials.vhost === "io-mqtt-poc" &&
  credentials.username === identity.username &&
  credentials.clientId === identity.clientId &&
  matchesSecret(credentials.password, identity.passwordHash);
