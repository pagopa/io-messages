import { QueueClient } from "@azure/storage-queue";
import { inject } from "vitest";

import { sortJson } from "./cassettes";
import { NotifyRuntime } from "./notify-runtime";
import {
  FULL_HOST_FALLBACK_REASON,
  NOTIFY_QUEUE_NAME,
  NOTIFY_ROUTE,
  READY_ROUTE,
} from "./scenarios";

const parseQueueMessage = (messageText: string): unknown => {
  try {
    return JSON.parse(messageText);
  } catch {
    return JSON.parse(Buffer.from(messageText, "base64").toString("utf8"));
  }
};

const waitFor = async (
  predicate: () => Promise<boolean>,
  timeoutMs: number,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
  }

  throw new Error("Notify runtime readiness probe did not succeed in time.");
};

export class NotifyCharacterizationHarness {
  private readonly connectionString: string;
  private readonly queueClient: QueueClient;
  private readonly queueName: string;
  private readonly runtime: NotifyRuntime;

  constructor() {
    this.connectionString = inject(
      "characterizationAzuriteConnectionString" as never,
    ) as string;
    this.queueName = inject("characterizationQueueName" as never) as string;
    this.queueClient = new QueueClient(this.connectionString, this.queueName);
    this.runtime = new NotifyRuntime({
      connectionString: this.connectionString,
      queueName: this.queueName,
    });
  }

  async readQueueMessages(): Promise<readonly unknown[]> {
    const { peekedMessageItems } = await this.queueClient.peekMessages({
      numberOfMessages: 32,
    });

    return peekedMessageItems.map((message) =>
      sortJson(parseQueueMessage(message.messageText)),
    );
  }

  async reset(): Promise<void> {
    await this.queueClient.createIfNotExists();
    await this.queueClient.clearMessages();
  }

  async start(): Promise<void> {
    await this.reset();
    await this.runtime.start();

    await waitFor(async () => {
      const response = await fetch(new URL(READY_ROUTE, this.baseUrl));

      return response.ok;
    }, 5000);
  }

  async stop(): Promise<void> {
    await this.runtime.stop();
  }

  topology(): Record<string, unknown> {
    return {
      boundary: "notify-wrapper-http-runtime",
      dependencies: {
        fixtures: [
          "profile-reader",
          "message-with-content-reader",
          "service-reader",
          "session-status-reader",
        ],
        queue: {
          emulator: "Azurite",
          queueName: this.queueName || NOTIFY_QUEUE_NAME,
        },
      },
      fallbackReason: FULL_HOST_FALLBACK_REASON,
      route: NOTIFY_ROUTE,
      runtimeBaseUrl: "http://127.0.0.1:<runtime-port>",
    };
  }

  get baseUrl(): string {
    return this.runtime.baseUrl;
  }
}
