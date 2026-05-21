import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import * as net from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

import { readHarnessState } from "./harness-state";

const readinessFiscalCode = "AAABBB01C02D345D";
const readinessMessageId = "host-readiness-check";
const readinessBody = {
  change_type: "reading",
  is_read: true,
};

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

export const createCitizenFuncHostEnv = (
  overrides: Record<string, string> = {},
): NodeJS.ProcessEnv => {
  const {
    azurite: { connectionString: storageConnectionString },
    cosmos,
  } = readHarnessState();

  return {
    ...process.env,
    APPLICATIONINSIGHTS_CONNECTION_STRING:
      "InstrumentationKey=00000000-0000-0000-0000-000000000000",
    AzureWebJobsStorage: storageConnectionString,
    COSMOSDB_NAME: cosmos.databaseName,
    COSMOSDB_URI: cosmos.endpoint,
    FF_BETA_TESTER_LIST: "",
    FF_CANARY_USERS_REGEX: "XYZ",
    FF_TYPE: "none",
    FUNCTIONS_WORKER_RUNTIME: "node",
    MESSAGE_CONTAINER_NAME: "messages",
    MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: storageConnectionString,
    NODE_ENV: "development",
    PN_SERVICE_ID: "a-pn-id",
    REDIS_PASSWORD: "local",
    REDIS_PORT: "6379",
    REDIS_TLS_ENABLED: "false",
    REDIS_URL: "localhost",
    REMOTE_CONTENT_COSMOSDB_NAME: cosmos.databaseName,
    REMOTE_CONTENT_COSMOSDB_URI: cosmos.endpoint,
    SERVICE_CACHE_TTL_DURATION: "6000",
    SERVICE_TO_RC_CONFIGURATION_MAP: "{}",
    USE_FALLBACK: "true",
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

  createFunctionUrl(pathname: string): string {
    return `${this.baseUrl}${pathname}`;
  }

  async start(): Promise<void> {
    if (!existsSync(`${this.cwd}/dist/main.js`)) {
      throw new Error(
        `Missing ${this.cwd}/dist/main.js. Build citizen-func before running the characterization suite.`,
      );
    }

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

    for (let attempt = 0; attempt < 120; attempt++) {
      if (this.#child.exitCode !== null) {
        throw new Error(
          `Functions host exited before it became ready.\n${this.collectedLogs}`,
        );
      }

      try {
        const response = await fetch(
          this.createFunctionUrl(
            `/api/v1/messages/${readinessFiscalCode}/${readinessMessageId}/message-status`,
          ),
          {
            body: JSON.stringify(readinessBody),
            headers: {
              "content-type": "application/json",
            },
            method: "PUT",
          },
        );

        if (response.status === 404) {
          return;
        }
      } catch {
        // Keep polling until the host route is reachable.
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
