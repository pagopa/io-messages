import { IClientOptions, MqttClient, connectAsync } from "mqtt";

import { certificate, mqttUrl } from "../config.js";

export interface ConsumerDetails {
  appId: string;
  clientId: string;
  password: string;
  serviceId: string;
  topic: string;
  username: string;
}

export const connectClient = (
  details: Pick<ConsumerDetails, "clientId" | "password" | "username">,
  options: IClientOptions = {},
): Promise<MqttClient> =>
  connectAsync(mqttUrl, {
    ca: certificate("ca.pem"),
    clean: false,
    clientId: details.clientId,
    connectTimeout: 5000,
    password: details.password,
    properties: { receiveMaximum: 20, sessionExpiryInterval: 3600 },
    protocolVersion: 5,
    reconnectPeriod: 0,
    username: details.username,
    ...options,
  });
