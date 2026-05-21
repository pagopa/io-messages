import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import * as https from "node:https";
import { fileURLToPath } from "node:url";

const keyPath = fileURLToPath(
  new URL("./certs/localhost-key.pem", import.meta.url),
);
const certPath = fileURLToPath(
  new URL("./certs/localhost-cert.pem", import.meta.url),
);

export interface NotificationHubRequest {
  body: string;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
}

export class NotificationHubsStub {
  #requests: NotificationHubRequest[] = [];
  #scheduledNotifications = new Set<string>();
  #server = https.createServer(
    {
      cert: readFileSync(certPath, "utf8"),
      key: readFileSync(keyPath, "utf8"),
    },
    (request, response) => {
      const bodyChunks: Buffer[] = [];

      request.on("data", (chunk: Buffer) => {
        bodyChunks.push(chunk);
      });

      request.on("end", () => {
        const rawBody = Buffer.concat(bodyChunks).toString("utf8");
        const requestUrl = new URL(
          request.url ?? "/",
          `https://127.0.0.1:${this.port}`,
        );
        const segments = requestUrl.pathname.split("/").filter(Boolean);
        const hubName = segments[0] ?? "hub";

        this.#requests.push({
          body: rawBody,
          headers: request.headers,
          method: request.method ?? "GET",
          url: requestUrl.pathname + requestUrl.search,
        });

        if (request.method === "GET" && segments[1] === "registrations") {
          response.writeHead(200, {
            "content-type": "application/atom+xml;type=feed;charset=utf-8",
          });
          response.end(
            '<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>',
          );
          return;
        }

        if (request.method === "PATCH" && segments[1] === "installations") {
          response.writeHead(200);
          response.end("");
          return;
        }

        if (request.method === "POST" && segments[1] === "messages") {
          const notificationId = randomUUID();
          response.writeHead(201, {
            location: `https://127.0.0.1:${this.port}/${hubName}/messages/${notificationId}`,
          });
          response.end("");
          return;
        }

        if (
          request.method === "POST" &&
          segments[1] === "schedulednotifications"
        ) {
          const notificationId = randomUUID();
          this.#scheduledNotifications.add(notificationId);
          response.writeHead(201, {
            location: `https://127.0.0.1:${this.port}/${hubName}/messages/${notificationId}`,
          });
          response.end("");
          return;
        }

        if (
          request.method === "DELETE" &&
          segments[1] === "schedulednotifications"
        ) {
          const notificationId = segments[2];
          if (notificationId) {
            this.#scheduledNotifications.delete(notificationId);
          }

          response.writeHead(200);
          response.end("");
          return;
        }

        if (
          request.method === "GET" &&
          segments[1] === "messages" &&
          segments[2]
        ) {
          const notificationId = segments[2];
          response.writeHead(200, {
            "content-type": "application/xml;charset=utf-8",
          });
          response.end(
            `<?xml version="1.0" encoding="utf-8"?><NotificationDetails><NotificationId>${notificationId}</NotificationId><State>Completed</State></NotificationDetails>`,
          );
          return;
        }

        response.writeHead(404);
        response.end("Unhandled Notification Hubs request");
      });
    },
  );

  constructor(readonly port: number) {}

  static async start(): Promise<NotificationHubsStub> {
    const port = await new Promise<number>((resolve, reject) => {
      const server = https.createServer();
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();

        if (!address || typeof address === "string") {
          reject(
            new Error(
              "Unable to allocate a port for the Notification Hub stub",
            ),
          );
          return;
        }

        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(address.port);
        });
      });
      server.on("error", reject);
    });

    const stub = new NotificationHubsStub(port);

    await new Promise<void>((resolve, reject) => {
      stub.#server.listen(port, "127.0.0.1", (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    return stub;
  }

  clearRequests(): void {
    this.#requests = [];
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.#server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  connectionString(): string {
    return `Endpoint=https://127.0.0.1:${this.port}/;SharedAccessKeyName=DefaultListenSharedAccessSignature;SharedAccessKey=fake=`;
  }

  get requests(): NotificationHubRequest[] {
    return [...this.#requests];
  }
}
