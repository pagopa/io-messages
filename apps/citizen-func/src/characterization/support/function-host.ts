/* eslint-disable no-console */
import { execSync, spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";

export const getFreePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address() as net.AddressInfo;
      srv.close(() => resolve(addr.port));
    });
    srv.on("error", reject);
  });

export const waitUntilReady = async (
  probe: () => Promise<void>,
  retries = 60,
  delayMs = 3000,
): Promise<void> => {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      await probe();
      return;
    } catch (err) {
      lastErr = err;
      await new Promise<void>((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(
    `Service did not become ready after ${retries * delayMs}ms: ${lastErr}`,
  );
};

export class FunctionHost {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private proc: ReturnType<typeof spawn> | undefined;
  readonly baseUrl: string;

  constructor(
    private readonly cwd: string,
    private readonly hostEnv: Record<string, string>,
    private readonly port: number,
  ) {
    this.baseUrl = `http://127.0.0.1:${port}/api/`;
  }

  build(): void {
    execSync("pnpm build", {
      cwd: this.cwd,
      env: { ...process.env },
      stdio: "inherit",
    });
  }

  async start(): Promise<void> {
    this.proc = spawn("func", ["start", "--port", String(this.port)], {
      cwd: this.cwd,
      // Spread process.env first to preserve PATH, then overlay harness env.
      env: { ...process.env, ...this.hostEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.proc.stdout?.on("data", (chunk: Buffer) => {
      process.stdout.write(`[func] ${chunk.toString()}`);
    });
    this.proc.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(`[func] ${chunk.toString()}`);
    });

    // Wait for the Info endpoint (anonymous) to return 200. This proves both
    // the host and its required dependencies (Cosmos + Storage) are healthy.
    await waitUntilReady(async () => {
      const url = new URL("v1/info", this.baseUrl);
      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Info returned ${res.status}: ${text}`);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.proc) {
        resolve();
        return;
      }
      this.proc.once("close", () => resolve());
      this.proc.kill("SIGINT");
    });
  }
}

// 3 levels up: support/ → characterization/ → src/ → apps/citizen-func/
export const APP_DIR = path.resolve(__dirname, "..", "..", "..");
