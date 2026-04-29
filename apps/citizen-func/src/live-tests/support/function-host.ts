/* eslint-disable no-console */
import { type ChildProcess, spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";

export const APP_DIR = path.resolve(__dirname, "..", "..", "..");

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const getFreePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (address === null || typeof address === "string") {
        reject(new Error("Unable to allocate a local port"));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });

    server.on("error", reject);
  });

export const waitUntilReady = async (baseUrl: string, timeoutMs = 90_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/info`, {
        signal: AbortSignal.timeout(5_000),
      });

      if (response.ok) {
        return;
      }

      lastError = new Error(`readiness probe returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await sleep(1_000);
  }

  throw new Error(
    `Function host did not become ready: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
};

interface FunctionHostOptions {
  env: NodeJS.ProcessEnv;
  port: number;
}

export class FunctionHost {
  #child: ChildProcess | undefined;
  readonly baseUrl: string;

  constructor(private readonly options: FunctionHostOptions) {
    this.baseUrl = `http://127.0.0.1:${String(options.port)}`;
  }

  async start() {
    if (this.#child !== undefined) {
      throw new Error("Function host already started");
    }

    const child = spawn(
      "func",
      ["start", "--port", String(this.options.port)],
      {
        cwd: APP_DIR,
        env: {
          ...process.env,
          ...this.options.env,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    child.stdout?.on("data", (chunk: Buffer | string) => {
      const lines = chunk.toString().trimEnd();

      if (lines.length > 0) {
        console.info(`[live-tests][func] ${lines}`);
      }
    });

    child.stderr?.on("data", (chunk: Buffer | string) => {
      const lines = chunk.toString().trimEnd();

      if (lines.length > 0) {
        console.info(`[live-tests][func][stderr] ${lines}`);
      }
    });

    child.once("exit", (code, signal) => {
      if (code !== 0 && code !== null) {
        console.info(`[live-tests][func] exited with code ${String(code)}`);
      }

      if (signal !== null) {
        console.info(`[live-tests][func] exited with signal ${String(signal)}`);
      }
    });

    this.#child = child;
  }

  async stop() {
    const child = this.#child;

    if (child === undefined) {
      return;
    }

    this.#child = undefined;

    if (child.exitCode !== null) {
      return;
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
      }, 5_000);

      child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });

      child.kill("SIGTERM");
    });
  }
}
