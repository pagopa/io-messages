import { setTimeout as delay } from "node:timers/promises";

import { brokerUrl, loadConfig } from "../config.js";
import { permissionsFor, topicPermissionsFor } from "../domain/policy.js";
import { jsonRequest } from "./http.js";

export class Broker {
  private headers = {
    Authorization: `Basic ${Buffer.from(`operator:${loadConfig().adminPassword}`).toString("base64")}`,
  };
  async disconnect(username: string): Promise<void> {
    await this.request(
      `/connections/username/${encodeURIComponent(username)}`,
      "DELETE",
    );
  }
  async provision(
    username: string,
    password: string,
    clientId: string,
    serviceId: string,
  ): Promise<void> {
    const user = encodeURIComponent(username);
    await this.request(`/users/${user}`, "PUT", { password, tags: "" });
    await this.request(
      `/topic-permissions/io-mqtt-poc/${user}`,
      "PUT",
      topicPermissionsFor(serviceId),
    );
    await this.request(
      `/permissions/io-mqtt-poc/${user}`,
      "PUT",
      permissionsFor(clientId),
    );
    const applied = await this.request<Record<string, string>>(
      `/permissions/io-mqtt-poc/${user}`,
    );
    const topics = await this.request<Record<string, string>[]>(
      `/topic-permissions/io-mqtt-poc/${user}`,
    );
    const expected = permissionsFor(clientId);
    if (
      Object.entries(expected).some(
        ([name, value]) => applied[name] !== value,
      ) ||
      !topics.some(
        (permission) =>
          permission.read === topicPermissionsFor(serviceId).read &&
          permission.write === "^$",
      )
    ) {
      throw new Error("Broker permission verification failed");
    }
  }
  async remove(username: string, clientId: string): Promise<void> {
    await this.disconnect(username);
    for (const qos of [0, 1]) {
      for (let attempt = 0; attempt < 20; attempt++) {
        try {
          await this.request(
            `/queues/io-mqtt-poc/${encodeURIComponent(`mqtt-subscription-${clientId}qos${qos}`)}`,
            "DELETE",
          );
          break;
        } catch (error) {
          if (error instanceof Error && error.message.startsWith("HTTP 404"))
            break;
          if (
            error instanceof Error &&
            /^HTTP (400|409)/.test(error.message) &&
            attempt < 19
          )
            await delay(50);
          else throw error;
        }
      }
    }
    try {
      await this.request(`/users/${encodeURIComponent(username)}`, "DELETE");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("HTTP 404"))
        throw error;
    }
  }
  request<Response = unknown>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<Response> {
    return jsonRequest<Response>(
      `${brokerUrl}/api${path}`,
      method,
      body,
      this.headers,
    );
  }
}
