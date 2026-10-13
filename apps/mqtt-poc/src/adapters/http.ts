import { request } from "node:https";

import { certificate } from "../config.js";

export const jsonRequest = <Response = unknown>(
  url: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Response> =>
  new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const connection = request(
      url,
      {
        ca: certificate("ca.pem"),
        headers: {
          ...(payload === undefined
            ? {}
            : { "Content-Type": "application/json" }),
          ...headers,
        },
        method,
        timeout: 15000,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          if ((response.statusCode ?? 500) >= 400) {
            reject(
              new Error(
                `HTTP ${response.statusCode} ${method} ${new URL(url).pathname}`,
              ),
            );
            return;
          }
          try {
            resolve((text ? JSON.parse(text) : undefined) as Response);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    connection.on("timeout", () =>
      connection.destroy(new Error("HTTP timeout")),
    );
    connection.on("error", reject);
    connection.end(payload);
  });
