import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Registry } from "../registry.js";

const directories: string[] = [];
afterEach(() =>
  directories
    .splice(0)
    .forEach((directory) => rmSync(directory, { recursive: true })),
);
const fixture = () => {
  const directory = mkdtempSync(join(tmpdir(), "mqtt-poc-test-"));
  directories.push(directory);
  const broker = {
    disconnect: vi.fn(async () => undefined),
    provision: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
  const file = join(directory, "registry.json");
  return { broker, file, registry: new Registry(broker, file) };
};

describe("provisioning lifecycle", () => {
  it("serializes concurrent onboarding and retains the same credentials", async () => {
    const { broker, file, registry } = fixture();
    const [first, second] = await Promise.all([
      registry.onboard("service-A", "app"),
      registry.onboard("service-A", "app"),
    ]);
    expect(first).toEqual(second);
    expect(broker.provision).toHaveBeenCalledTimes(1);
    expect(new Registry(broker, file).find(first.username)).toEqual(first);
  });
  it("keeps partial provisioning pending and resumes without credential rotation", async () => {
    const { broker, registry } = fixture();
    broker.provision.mockRejectedValueOnce(
      new Error("Injected permission failure"),
    );
    await expect(registry.onboard("service-A", "app")).rejects.toThrow();
    const pending = registry.all()[0];
    expect(pending.state).toBe("pending");
    const active = await registry.onboard("service-A", "app");
    expect(active.clientId).toBe(pending.clientId);
    expect(active.password).toBe(pending.password);
    expect(active.state).toBe("active");
  });
  it("disables credentials before partial cleanup and supports repeated revocation", async () => {
    const { broker, registry } = fixture();
    const registration = await registry.onboard("service-A", "app");
    broker.remove.mockRejectedValueOnce(new Error("Injected cleanup failure"));
    await expect(registry.revoke(registration.username)).rejects.toThrow();
    expect(registry.find(registration.username)?.state).toBe("revoking");
    await registry.revoke(registration.username);
    await registry.revoke(registration.username);
    expect(registry.find(registration.username)?.state).toBe("revoked");
    await expect(registry.onboard("service-A", "app")).rejects.toThrow(
      "revoked",
    );
  });
  it("rotates credentials only after disabling the old identity", async () => {
    const { broker, registry } = fixture();
    const previous = await registry.onboard("service-A", "app");
    broker.disconnect.mockImplementationOnce(async () => {
      expect(registry.find(previous.username)?.state).toBe("pending");
    });
    const updated = await registry.rotate(previous.username);
    expect(updated.clientId).toBe(previous.clientId);
    expect(updated.password).not.toBe(previous.password);
    expect(updated.state).toBe("active");
  });
});
