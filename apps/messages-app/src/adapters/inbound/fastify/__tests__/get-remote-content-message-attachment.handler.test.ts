import type { FastifyInstance } from "fastify";

import { FiscalCodeSchema } from "@pagopa/hexagonal-core";
import fastify from "fastify";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GetRemoteContentMessageAttachmentUseCase } from "../../../../application/use-cases/get-remote-content-message-attachment.use-case.js";

import {
  RemoteContentAttachmentUnsupportedMediaTypeError,
  RemoteContentServiceUnavailableError,
} from "../../../../application/ports/remote-content-message-attachment.js";
import { mountGetRemoteContentMessageAttachmentHandler } from "../get-remote-content-message-attachment.handler.js";

const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const attachmentPath =
  "delivery/notifications/received/IUN/attachments/documents/0";
const attachmentUrl = `${attachmentPath}?download=true`;
const attachment = Buffer.from("%PDF-1.7 attachment bytes");

const xUser = Buffer.from(
  JSON.stringify({
    date_of_birth: "1980-01-01",
    family_name: "Rossi",
    fiscal_code: fiscalCode,
    name: "Mario",
    spid_level: "https://www.spid.gov.it/SpidL2",
  }),
).toString("base64");

describe("mountGetRemoteContentMessageAttachmentHandler", () => {
  let server: FastifyInstance;
  let useCase: GetRemoteContentMessageAttachmentUseCase;

  beforeEach(() => {
    server = fastify();
    useCase = vi.fn().mockResolvedValue(ok(attachment));
    mountGetRemoteContentMessageAttachmentHandler(server, useCase);
  });

  afterEach(async () => {
    await server.close();
  });

  it("forwards the full attachment path and query and returns octet bytes", async () => {
    const response = await server.inject({
      headers: { "x-user": xUser },
      method: "GET",
      url: `/api/v1/third-party-messages/${messageId}/attachments/${attachmentUrl}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain(
      "application/octet-stream",
    );
    expect(response.rawPayload).toEqual(attachment);
    expect(useCase).toHaveBeenCalledWith({
      assertionRef: undefined,
      attachmentUrl,
      fiscalCode,
      lollipopRequestHeaders: expect.any(Object),
      messageId,
    });
  });

  it("maps non-PDF attachments to 415", async () => {
    vi.mocked(useCase).mockResolvedValueOnce(
      err(
        new RemoteContentAttachmentUnsupportedMediaTypeError(
          "The requested file is not a valid PDF",
        ),
      ),
    );

    const response = await server.inject({
      headers: { "x-user": xUser },
      method: "GET",
      url: `/api/v1/third-party-messages/${messageId}/attachments/${attachmentUrl}`,
    });

    expect(response.statusCode).toBe(415);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(response.json()).toMatchObject({
      detail: "The requested file is not a valid PDF",
      status: 415,
    });
  });

  it("preserves Retry-After for service unavailable responses", async () => {
    vi.mocked(useCase).mockResolvedValueOnce(
      err(new RemoteContentServiceUnavailableError("45")),
    );

    const response = await server.inject({
      headers: { "x-user": xUser },
      method: "GET",
      url: `/api/v1/third-party-messages/${messageId}/attachments/${attachmentUrl}`,
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers["retry-after"]).toBe("45");
  });
});
