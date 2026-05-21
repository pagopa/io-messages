import { QueueClient } from "@azure/storage-queue";
import { randomUUID } from "node:crypto";

import { readHarnessState } from "./harness-state";

export const azuriteConnectionString = (): string =>
  readHarnessState().azurite.connectionString;

export const createQueueClient = (queueName: string): QueueClient =>
  new QueueClient(azuriteConnectionString(), queueName);

export const createQueueName = (prefix: string): string =>
  `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 24)}`;

export const decodeQueueMessage = (messageText: string): unknown => {
  try {
    return JSON.parse(messageText);
  } catch {
    return JSON.parse(Buffer.from(messageText, "base64").toString("utf8"));
  }
};
