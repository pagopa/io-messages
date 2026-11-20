import type { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";

import { FiscalCodeSchema, GenericError } from "@pagopa/hexagonal-core";
import { noopLogger } from "@pagopa/hexagonal-core/adapters/logger";
import { anAssertionRef } from "io-messages-common/adapters/lollipop/__mocks__/lollipop";
import { createServer } from "node:http";
import { describe, expect, it, vi } from "vitest";

import { LollipopHttpClientAdapter } from "../lollipop/lollipop.adapter.js";
import { PagoPAEcommerceHttpClientAdapter } from "../pagopa-ecommerce/pagopa-ecommerce.js";
import { RemoteContentHTTPAdapter } from "../remote-content/remote-content-http.js";
import { SendHTTPAdapter } from "../remote-content/send-http.js";
import { ServicesCmsHttpClientAdapter } from "../services-cms/services-cms.js";

const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
const authentication: RCAuthenticationConfig = {
  headerKeyName: "x-api-key",
  key: "test-key",
  type: "API_KEY",
};
const attachmentURL =
  "/delivery/notifications/received/iun/attachments/documents/0";

const cases = [
  {
    call: (baseURL: URL) =>
      new ServicesCmsHttpClientAdapter(
        baseURL,
        "test-key",
        noopLogger,
      ).getServicesCmsDetailsByServiceIds(["service"]),
    name: "Services CMS batch",
    timeoutMs: 3000,
  },
  {
    call: (baseURL: URL) =>
      new LollipopHttpClientAdapter("test-key", baseURL).generateLcParams(
        anAssertionRef,
        "operation",
      ),
    name: "Lollipop",
    timeoutMs: 3000,
  },
  {
    call: (baseURL: URL) =>
      new PagoPAEcommerceHttpClientAdapter(
        { apiKey: "test-key", baseURL },
        { apiKey: "test-key", baseURL },
      ).getPaymentInfo("12345678901234567890123456789012345", false),
    name: "pagoPA eCommerce",
    timeoutMs: 3000,
  },
  {
    call: (baseURL: URL) =>
      new RemoteContentHTTPAdapter(noopLogger).getRemoteContentMessage(
        baseURL,
        authentication,
        "message",
        fiscalCode,
      ),
    name: "Remote Content",
    timeoutMs: 3000,
  },
  {
    call: (baseURL: URL) =>
      new SendHTTPAdapter(noopLogger).getNotification(
        baseURL,
        authentication,
        "iun",
        fiscalCode,
      ),
    name: "SEND",
    timeoutMs: 3000,
  },
  {
    call: (baseURL: URL) =>
      new RemoteContentHTTPAdapter(
        noopLogger,
      ).getRemoteContentMessageAttachment(
        baseURL,
        authentication,
        "message",
        "document.pdf",
        fiscalCode,
      ),
    name: "Remote Content attachment",
    timeoutMs: 5000,
  },
  {
    call: (baseURL: URL) =>
      new SendHTTPAdapter(noopLogger).getNotificationAttachment(
        baseURL,
        authentication,
        "iun",
        attachmentURL,
        fiscalCode,
      ),
    name: "SEND attachment metadata",
    timeoutMs: 3000,
  },
  {
    call: (baseURL: URL) =>
      new SendHTTPAdapter(noopLogger).getNotificationAttachment(
        baseURL,
        authentication,
        "iun",
        attachmentURL,
        fiscalCode,
      ),
    download: true,
    name: "SEND attachment download",
    timeoutMs: 5000,
  },
];

describe("Native outbound HTTP timeouts", () => {
  it.each(cases)(
    "returns GenericError for a stalled $name body after $timeoutMs ms",
    async ({ call, name, timeoutMs, ...options }) => {
      let baseURL = new URL("http://127.0.0.1");
      const download = "download" in options && options.download;
      const server = createServer((request, response) => {
        request.resume();
        response.writeHead(200, { "Content-Type": "application/json" });
        if (download && request.url !== "/download") {
          response.end(
            JSON.stringify({
              contentLength: 12,
              contentType: "application/pdf",
              filename: "attachment.pdf",
              sha256: "digest",
              url: new URL("/download", baseURL).toString(),
            }),
          );
        } else {
          response.write("{");
        }
      });
      await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", resolve);
      });
      const timeout = vi.spyOn(AbortSignal, "timeout");
      try {
        const address = server.address();
        if (!address || typeof address === "string") {
          throw new Error(`Expected a TCP listening address for ${name}`);
        }
        baseURL = new URL(`http://127.0.0.1:${address.port}`);
        const result = await call(baseURL);

        expect(timeout).toHaveBeenCalledWith(timeoutMs);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
        expect(result._unsafeUnwrapErr().message).toMatch(/timeout/i);
        if (download) {
          expect(timeout).toHaveBeenNthCalledWith(1, 3000);
          expect(timeout).toHaveBeenNthCalledWith(2, 5000);
        }
      } finally {
        timeout.mockRestore();
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    },
    10000,
  );
});
