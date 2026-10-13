import { describe, expect, it } from "vitest";

import {
  authenticateConsumer,
  permissionsFor,
  secretHash,
  topicFor,
  topicPermissionsFor,
} from "../policy.js";

describe("service and session isolation", () => {
  const identity = {
    clientId: "consumer-A",
    passwordHash: secretHash("synthetic-password"),
    state: "active" as const,
    username: "service-A-app",
  };
  const credentials = {
    clientId: "consumer-A",
    password: "synthetic-password",
    username: identity.username,
    vhost: "io-mqtt-poc",
  };

  it("binds the authenticated identity to its registered clientId at CONNECT", () => {
    expect(authenticateConsumer(identity, credentials)).toBe(true);
    expect(
      authenticateConsumer(identity, {
        ...credentials,
        clientId: "consumer-B",
      }),
    ).toBe(false);
    expect(
      authenticateConsumer(identity, { ...credentials, clientId: undefined }),
    ).toBe(false);
    expect(
      authenticateConsumer(identity, { ...credentials, password: "incorrect" }),
    ).toBe(false);
    expect(
      authenticateConsumer({ ...identity, state: "pending" }, credentials),
    ).toBe(false);
    expect(
      authenticateConsumer({ ...identity, state: "revoked" }, credentials),
    ).toBe(false);
  });

  it("allows only the owned session resources and denies exchange publishing", () => {
    const permissions = permissionsFor(identity.clientId);
    expect(
      new RegExp(permissions.read).test("mqtt-subscription-consumer-Aqos1"),
    ).toBe(true);
    expect(
      new RegExp(permissions.read).test("mqtt-subscription-consumer-Bqos1"),
    ).toBe(false);
    expect(new RegExp(permissions.write).test("amq.topic")).toBe(false);
    expect(
      new RegExp(permissions.configure).test(
        "mqtt-subscription-consumer-Aqos1-extra",
      ),
    ).toBe(false);
  });

  it("denies other services and wildcard binding keys even in the same organization", () => {
    const permission = new RegExp(topicPermissionsFor("service-A").read);
    expect(permission.test(topicFor("service-A").replaceAll("/", "."))).toBe(
      true,
    );
    expect(permission.test(topicFor("service-B").replaceAll("/", "."))).toBe(
      false,
    );
    expect(permission.test("io.v1.services.*.messages.status")).toBe(false);
    expect(permission.test("io.v1.services.service-A.#")).toBe(false);
    expect(() => topicFor("service-A/../service-B")).toThrow();
  });
});
