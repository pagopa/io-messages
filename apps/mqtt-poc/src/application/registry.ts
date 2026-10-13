import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { stateDir } from "../config.js";
import {
  Identity,
  identifierSchema,
  secretHash,
  topicFor,
} from "../domain/policy.js";

export interface Registration extends Identity {
  appId: string;
  password: string;
  serviceId: string;
}
export interface ProvisioningBroker {
  disconnect(username: string): Promise<void>;
  provision(
    username: string,
    password: string,
    clientId: string,
    serviceId: string,
  ): Promise<void>;
  remove(username: string, clientId: string): Promise<void>;
}

export class Registry {
  private registrations: Registration[];
  private serial: Promise<unknown> = Promise.resolve();
  constructor(
    private broker: ProvisioningBroker,
    private file = resolve(stateDir, "registry.json"),
  ) {
    this.registrations = existsSync(file)
      ? (JSON.parse(readFileSync(file, "utf8")) as Registration[])
      : [];
  }
  private exclusive<Result>(operation: () => Promise<Result>): Promise<Result> {
    const result = this.serial.then(operation);
    this.serial = result.catch(() => undefined);
    return result;
  }
  private save(): void {
    writeFileSync(`${this.file}.tmp`, JSON.stringify(this.registrations), {
      mode: 0o600,
    });
    renameSync(`${this.file}.tmp`, this.file);
  }
  all(): Registration[] {
    return this.registrations.map((entry) => ({ ...entry }));
  }
  find(username: string): Registration | undefined {
    return this.all().find((entry) => entry.username === username);
  }
  async onboard(serviceId: string, appId: string): Promise<Registration> {
    identifierSchema.parse(serviceId);
    identifierSchema.parse(appId);
    return this.exclusive(async () => {
      let registration = this.registrations.find(
        (entry) => entry.serviceId === serviceId && entry.appId === appId,
      );
      if (
        registration?.state === "revoked" ||
        registration?.state === "revoking"
      )
        throw new Error("Registration revoked");
      if (!registration) {
        const clientId = `client-${randomUUID()}`;
        const password = randomBytes(32).toString("hex");
        registration = {
          appId,
          clientId,
          password,
          passwordHash: secretHash(password),
          serviceId,
          state: "pending",
          username: clientId,
        };
        this.registrations.push(registration);
        this.save();
      }
      if (registration.state !== "active") {
        await this.broker.provision(
          registration.username,
          registration.password,
          registration.clientId,
          serviceId,
        );
        registration.state = "active";
        this.save();
      }
      return { ...registration };
    });
  }
  async revoke(username: string): Promise<void> {
    return this.exclusive(async () => {
      const registration = this.registrations.find(
        (entry) => entry.username === username,
      );
      if (!registration) return;
      registration.state = "revoking";
      this.save();
      await this.broker.remove(username, registration.clientId);
      registration.state = "revoked";
      registration.password = "";
      registration.passwordHash = "";
      this.save();
    });
  }
  async rotate(username: string): Promise<Registration> {
    return this.exclusive(async () => {
      const registration = this.registrations.find(
        (entry) => entry.username === username,
      );
      if (
        !registration ||
        registration.state === "revoked" ||
        registration.state === "revoking"
      )
        throw new Error("Registration not active");
      registration.state = "pending";
      this.save();
      await this.broker.disconnect(username);
      registration.password = randomBytes(32).toString("hex");
      registration.passwordHash = secretHash(registration.password);
      this.save();
      await this.broker.provision(
        username,
        registration.password,
        registration.clientId,
        registration.serviceId,
      );
      registration.state = "active";
      this.save();
      return { ...registration };
    });
  }
}

export const connectionDetails = (registration: Registration) => ({
  appId: registration.appId,
  clientId: registration.clientId,
  endpoint: "mqtts://localhost:18883",
  password: registration.password,
  protocolVersion: 5,
  qos: 1,
  serviceId: registration.serviceId,
  sessionExpiryInterval: 3600,
  topic: topicFor(registration.serviceId),
  username: registration.username,
});
