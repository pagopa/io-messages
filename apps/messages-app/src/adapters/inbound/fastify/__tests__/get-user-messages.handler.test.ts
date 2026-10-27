import type { FastifyInstance } from "fastify";

import {
  FiscalCodeSchema,
  GenericError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import fastify from "fastify";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PaginatedPublicMessagesCollection } from "../../../../application/ports/messages.js";
import type { GetMessagesByUserUseCase } from "../../../../application/use-cases/get-user-messages.use-case.js";

import { mountGetMessagesByUserHandler } from "../get-user-messages.handler.js";

const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");

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
  created_at: "2024-02-03T04:05:06.000Z",
  fiscal_code: fiscalCode,
  id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  sender_service_id: "01JR0QRJ8MX1PD06DE6X5FWXS5",
};

const enrichedMessage = {
  ...baseMessage,
  category: { tag: "GENERIC" as const },
  has_attachments: false,
  has_precondition: false,
  is_archived: false,
  is_read: true,
  message_title: "A valid message subject",
  organization_fiscal_code: "12345678901",
  organization_name: "Organization",
  service_name: "Service",
};

const output: PaginatedPublicMessagesCollection = {
  items: [enrichedMessage, baseMessage],
  next: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
  prev: "01ARZ3NDEKTSV4RRFFQ69G5FAB",
};

describe("mountGetMessagesByUserHandler", () => {
  let server: FastifyInstance;
  let useCase: GetMessagesByUserUseCase;

  beforeEach(() => {
    server = fastify();
    useCase = vi.fn().mockResolvedValue(ok(output));
    mountGetMessagesByUserHandler(server, useCase);
  });

  afterEach(async () => {
    await server.close();
  });

  it("maps fiscal code from x-user and applies query defaults", async () => {
    const response = await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: "/api/messages",
    });

    expect(response.statusCode).toBe(200);
    expect(useCase).toHaveBeenCalledWith({
      archived: false,
      fiscalCode,
      maximumID: undefined,
      minimumID: undefined,
      pageSize: 12,
    });
  });

  it("maps every query parameter", async () => {
    await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: "/api/messages?archived=true&maximum_id=01MAX&minimum_id=01MIN&page_size=5",
    });

    expect(useCase).toHaveBeenCalledWith({
      archived: true,
      fiscalCode,
      maximumID: "01MAX",
      minimumID: "01MIN",
      pageSize: 5,
    });
  });

  it("returns enriched and plain messages with pagination links", async () => {
    const response = await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: "/api/messages",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(output);
  });

  it("returns an empty collection", async () => {
    vi.mocked(useCase).mockResolvedValue(ok({ items: [] }));

    const response = await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: "/api/messages",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ items: [] });
  });

  it("ignores a fiscal code supplied outside of x-user", async () => {
    await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: "/api/messages?fiscal_code=AAAAAA00A00A000A",
    });

    expect(useCase).toHaveBeenCalledWith(
      expect.objectContaining({ fiscalCode }),
    );
  });

  it.each([
    ["missing", undefined],
    ["not base64", { "x-user": "not-valid-base64!@#" }],
    ["not a user identity", { "x-user": Buffer.from("{}").toString("base64") }],
  ])("returns 400 when x-user is %s", async (_label, headers) => {
    const response = await server.inject({
      headers,
      method: "GET",
      url: "/api/messages",
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(useCase).not.toHaveBeenCalled();
  });

  it.each([
    ["page_size too small", "page_size=0"],
    ["page_size too large", "page_size=101"],
    ["page_size not an integer", "page_size=1.5"],
    ["page_size not a number", "page_size=abc"],
    ["archived not a boolean", "archived=maybe"],
  ])("returns 400 when %s", async (_label, queryString) => {
    const response = await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: `/api/messages?${queryString}`,
    });

    expect(response.statusCode).toBe(400);
    expect(useCase).not.toHaveBeenCalled();
  });

  it("does not match the legacy route with the fiscal code in the path", async () => {
    const response = await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: `/api/messages/${fiscalCode}`,
    });

    expect(response.statusCode).toBe(404);
    expect(useCase).not.toHaveBeenCalled();
  });

  it.each([
    [new TooManyRequestsError(), 429],
    [new GenericError("failed"), 500],
  ])("maps domain errors to problem responses", async (error, statusCode) => {
    vi.mocked(useCase).mockResolvedValue(err(error));

    const response = await server.inject({
      headers: xUserHeaders,
      method: "GET",
      url: "/api/messages",
    });

    expect(response.statusCode).toBe(statusCode);
    expect(response.json().status).toBe(statusCode);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
  });
});
