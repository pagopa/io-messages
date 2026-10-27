import type { FastifyInstance } from "fastify";

import {
  FiscalCodeSchema,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import fastify from "fastify";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MessageOutput } from "../../../../application/ports/messages.js";
import type { GetMessageUseCase } from "../../../../application/use-cases/get-message.use-case.js";

import { mountGetMessageHandler } from "../get-message.handler.js";

const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

const xUserHeaders = {
  "x-user": Buffer.from(
    JSON.stringify({
      date_of_birth: "1980-01-01",
      family_name: "Rossi",
      fiscal_code: fiscalCode,
      name: "Mario",
      spid_level: "https://www.spid.gov.it/SpidL2",
    }),
  ).toString("base64"),
};

const baseMessage = {
  content: {
    markdown: "a".repeat(100),
    subject: "A valid message subject",
  },
  created_at: "2024-02-03T04:05:06.000Z",
  fiscal_code: fiscalCode,
  id: messageId,
  sender_service_id: "01JR0QRJ8MX1PD06DE6X5FWXS5",
};

const publicOutput: MessageOutput = { message: baseMessage };

const enrichedOutput: MessageOutput = {
  message: {
    ...baseMessage,
    category: { tag: "GENERIC" },
    is_archived: false,
    is_read: true,
    message_title: "A valid message subject",
    organization_fiscal_code: "12345678901",
    organization_name: "Organization",
    service_name: "Service",
  },
};

describe("mountGetMessageHandler", () => {
  let server: FastifyInstance;
  let useCase: GetMessageUseCase;

  beforeEach(() => {
    server = fastify();
    useCase = vi.fn().mockResolvedValue(ok(enrichedOutput));
    mountGetMessageHandler(server, useCase);
  });

  afterEach(async () => {
    await server.close();
  });

  it.each([
    ["default", "", false],
    ["true", "?public_message=true", true],
    ["false", "?public_message=false", false],
  ])(
    "maps fiscal code from x-user and public_message %s",
    async (_label, queryString, publicMessage) => {
      const response = await server.inject({
        headers: xUserHeaders,
        method: "GET",
        url: `/api/messages/${messageId}${queryString}`,
      });

      expect(response.statusCode).toBe(200);
      expect(useCase).toHaveBeenCalledWith({
        fiscalCode,
        messageId,
        publicMessage,
      });
    },
  );

  it("returns the enriched message", async () => {
    const response = await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: `/api/messages/${messageId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(enrichedOutput);
  });

  it("returns the public message", async () => {
    vi.mocked(useCase).mockResolvedValue(ok(publicOutput));

    const response = await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: `/api/messages/${messageId}?public_message=true`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(publicOutput);
  });

  it("ignores a fiscal code supplied outside of x-user", async () => {
    await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: `/api/messages/${messageId}?fiscal_code=AAAAAA00A00A000A`,
    });

    expect(useCase).toHaveBeenCalledWith(
      expect.objectContaining({ fiscalCode }),
    );
  });

  it.each([
    ["missing", undefined],
    ["not base64", { "x-user": "not-valid-base64!@#" }],
    ["not a user identity", { "x-user": Buffer.from("{}").toString("base64") }],
    [
      "missing the fiscal code",
      {
        "x-user": Buffer.from(
          JSON.stringify({
            date_of_birth: "1980-01-01",
            family_name: "Rossi",
            name: "Mario",
            spid_level: "https://www.spid.gov.it/SpidL2",
          }),
        ).toString("base64"),
      },
    ],
  ])("returns 400 when x-user is %s", async (_label, headers) => {
    const response = await server.inject({
      headers,
      method: "GET",
      url: `/api/messages/${messageId}`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(useCase).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid public_message value", async () => {
    const response = await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: `/api/messages/${messageId}?public_message=maybe`,
    });

    expect(response.statusCode).toBe(400);
    expect(useCase).not.toHaveBeenCalled();
  });

  it("does not match the legacy route with the fiscal code in the path", async () => {
    const response = await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: `/api/messages/${fiscalCode}/${messageId}`,
    });

    expect(response.statusCode).toBe(404);
    expect(useCase).not.toHaveBeenCalled();
  });

  it.each([
    [new NotFoundError("message", messageId), 404],
    [new TooManyRequestsError(), 429],
    [new GenericError("failed"), 500],
  ])("maps domain errors to problem responses", async (error, statusCode) => {
    vi.mocked(useCase).mockResolvedValue(err(error));

    const response = await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: `/api/messages/${messageId}`,
    });

    expect(response.statusCode).toBe(statusCode);
    expect(response.json().status).toBe(statusCode);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
  });
});
