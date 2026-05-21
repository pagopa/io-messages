import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import * as net from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

import { readHarnessState } from "./harness-state";

const disabledFunctions = [
  "HandleNHCreateOrUpdateInstallationCallOrchestrator",
  "HandleNHNotificationCall",
  "HandleNHNotifyMessageCallActivityQueue",
  "HandleNHDeleteInstallationCallOrchestrator",
  "InstallationUpdateDispatcher",
  "UpdateInstallation",
  "CreateMassiveNotificationJob",
  "StartMassiveNotificationJob",
  "GetMassiveNotificationJob",
  "CancelMassiveNotificationJob",
  "CheckMassiveJob",
  "ProcessMassiveJob",
];

const notificationHubEndpoint =
  "Endpoint=sb://test.servicebus.windows.net/;SharedAccessKeyName=DefaultListenSharedAccessSignature;SharedAccessKey=fake=";

const getAvailablePort = async (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Unable to allocate a port for the Functions host"));
        return;
      }

      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(address.port);
      });
    });
    server.on("error", reject);
  });

export const createPushnotifHostEnv = (
  overrides: Record<string, string> = {},
): NodeJS.ProcessEnv => {
  const storageConnectionString = readHarnessState().azurite.connectionString;

  return {
    ...process.env,
    APPINSIGHTS_SAMPLING_PERCENTAGE: "20",
    APPLICATIONINSIGHTS_CONNECTION_STRING:
      "InstrumentationKey=00000000-0000-0000-0000-000000000000",
    AzureWebJobsStorage: storageConnectionString,
    COM_COSMOS__accountEndpoint: "https://example.com",
    COSMOSDB_NAME: "io-messages",
    COSMOSDB_URI: "https://example.com",
    DURABLE_FUNCTION_STORAGE_CONNECTION_STRING: storageConnectionString,
    FUNCTIONS_WORKER_RUNTIME: "node",
    INSTALLATION_SUMMARIES_CONTAINER_NAME: "installation-summaries",
    INSTALLATION_SUMMARIES_LEASE_CONTAINER_PREFIX: "0-",
    MASSIVE_JOBS_CONTAINER_NAME: "massive-jobs",
    MASSIVE_PROGRESS_CONTAINER_NAME: "massive-progress",
    MESSAGE_CONTAINER_NAME: "message-content",
    MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: storageConnectionString,
    NH1_ENDPOINT: notificationHubEndpoint,
    NH1_NAME: "nh-partition-1",
    NH1_PARTITION_REGEX: "^[0-3]",
    NH2_ENDPOINT: notificationHubEndpoint,
    NH2_NAME: "nh-partition-2",
    NH2_PARTITION_REGEX: "^[4-7]",
    NH3_ENDPOINT: notificationHubEndpoint,
    NH3_NAME: "nh-partition-3",
    NH3_PARTITION_REGEX: "^[8-b]",
    NH4_ENDPOINT: notificationHubEndpoint,
    NH4_NAME: "nh-partition-4",
    NH4_PARTITION_REGEX: "^[c-f]",
    NODE_ENV: "development",
    NOTIFICATIONS_STORAGE_CONNECTION_STRING: storageConnectionString,
    PUSH_DATABASE_NAME: "io-messages",
    SESSION_MANAGER_API_KEY: "test-api-key",
    SESSION_MANAGER_BASE_URL: "http://127.0.0.1:3999",
    SLOT_TASK_HUBNAME: "PushnotifFuncTests",
    UPDATE_ALL_INSTALLATIONS_TIME_TO_REACH: "86400",
    ...Object.fromEntries(
      disabledFunctions.map((functionName) => [
        `AzureWebJobs.${functionName}.Disabled`,
        "true",
      ]),
    ),
    ...overrides,
  };
};

export class FunctionHost {
  #child: ChildProcessWithoutNullStreams | undefined;
  #logs: string[] = [];
  #port: number | undefined;

  constructor(
    private readonly cwd: string,
    private readonly env: NodeJS.ProcessEnv,
  ) {}

  async start(): Promise<void> {
    this.#port = await getAvailablePort();

    this.#child = spawn("func", ["start", "--port", `${this.#port}`], {
      cwd: this.cwd,
      env: this.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.#child.stdout.on("data", (chunk: Buffer) => {
      this.#logs.push(chunk.toString("utf8"));
    });

    this.#child.stderr.on("data", (chunk: Buffer) => {
      this.#logs.push(chunk.toString("utf8"));
    });

    for (let attempt = 0; attempt < 60; attempt++) {
      if (this.#child.exitCode !== null) {
        throw new Error(
          `Functions host exited before it became ready.\n${this.collectedLogs}`,
        );
      }

      try {
        const response = await fetch(`${this.baseUrl}/api/v1/info`);
        if (response.ok) {
          return;
        }
      } catch {
        // Keep polling until the host is reachable.
      }

      await sleep(500);
    }

    throw new Error(
      `Functions host did not become ready in time.\n${this.collectedLogs}`,
    );
  }

  async stop(): Promise<void> {
    if (!this.#child) {
      return;
    }

    const child = this.#child;

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (child.exitCode === null) {
          child.kill("SIGKILL");
        }
      }, 5000);

      child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });

      if (child.exitCode === null) {
        child.kill("SIGINT");
      } else {
        clearTimeout(timeout);
        resolve();
      }
    });

    this.#child = undefined;
  }

  get baseUrl(): string {
    if (!this.#port) {
      throw new Error("The Functions host is not started yet");
    }

    return `http://127.0.0.1:${this.#port}`;
  }

  get collectedLogs(): string {
    return this.#logs.join("");
  }
}
