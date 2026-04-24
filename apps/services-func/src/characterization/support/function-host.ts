import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

const HOST_START_TIMEOUT_MS = 60_000;
const READINESS_POLL_INTERVAL_MS = 1_000;

export class FunctionHost {
  private child: ChildProcess | undefined;
  private readonly outputChunks: string[] = [];
  private startupError: Error | undefined;

  constructor(
    private readonly cwd: string,
    private readonly env: NodeJS.ProcessEnv,
    private readonly port: number,
    private readonly functions: readonly string[],
  ) {}

  private assertRunning(): void {
    if (this.startupError !== undefined) {
      throw new Error(
        `Unable to start the Azure Functions host: ${this.startupError.message}\n\n${this.output}`,
      );
    }

    if (this.child === undefined) {
      throw new Error("Azure Functions host was not started.");
    }

    if (this.child.exitCode !== null) {
      throw new Error(
        `Azure Functions host exited with code ${this.child.exitCode}.\n\n${this.output}`,
      );
    }
  }

  async start(): Promise<void> {
    const child = spawn(
      "func",
      [
        "start",
        "--port",
        String(this.port),
        "--functions",
        ...this.functions,
        "--verbose",
      ],
      {
        cwd: this.cwd,
        env: this.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    if (child.stdout === null || child.stderr === null) {
      throw new Error(
        "Azure Functions host did not expose stdout and stderr pipes.",
      );
    }

    this.child = child;

    child.once("error", (error) => {
      this.startupError = error;
    });

    child.stdout.on("data", (chunk: Buffer | string) => {
      this.outputChunks.push(chunk.toString());
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      this.outputChunks.push(chunk.toString());
    });

    const startedAt = Date.now();

    while (Date.now() - startedAt < HOST_START_TIMEOUT_MS) {
      this.assertRunning();

      try {
        const response = await fetch(`${this.apiBaseUrl}/info`, {
          signal: AbortSignal.timeout(3_000),
        });

        if (response.ok) {
          return;
        }
      } catch {
        // Keep polling until the host is ready or exits.
      }

      await delay(READINESS_POLL_INTERVAL_MS);
    }

    this.assertRunning();
    throw new Error(
      `Timed out waiting for the Azure Functions host to become ready.\n\n${this.output}`,
    );
  }

  async stop(): Promise<void> {
    if (this.child === undefined || this.child.exitCode !== null) {
      return;
    }

    this.child.kill("SIGINT");

    await Promise.race([
      once(this.child, "exit").then(() => undefined),
      delay(5_000).then(async () => {
        if (this.child !== undefined && this.child.exitCode === null) {
          this.child.kill("SIGKILL");
          await once(this.child, "exit");
        }
      }),
    ]);
  }

  get apiBaseUrl(): string {
    return `${this.baseUrl}/api`;
  }

  get baseUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  get output(): string {
    return this.outputChunks.join("");
  }
}
