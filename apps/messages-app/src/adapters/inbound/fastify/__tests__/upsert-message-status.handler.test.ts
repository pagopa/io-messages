import type { FastifyInstance } from "fastify";

import {
  ConflictError,
  FiscalCodeSchema,
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import fastify from "fastify";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MessageStatus } from "../../../../application/ports/message-status.js";
import type { UpdateMessageStatusUseCase } from "../../../../application/use-cases/update-message-status.use-case.js";

import { mountUpsertMessageStatusHandler } from "../upsert-message-status.handler.js";

const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const status: MessageStatus = {
  fiscalCode,
  id: `${messageId}-0000000000000001`,
  isArchived: true,
  isRead: true,
  messageId,
  status: "PROCESSED",
  updatedAt: "2024-02-03T04:05:06.000Z",
  version: 1,
};

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

describe("mountUpsertMessageStatusHandler", () => {
  let server: FastifyInstance;
  let useCase: UpdateMessageStatusUseCase;

  beforeEach(() => {
    server = fastify();
    useCase = vi.fn().mockResolvedValue(ok(status));
    mountUpsertMessageStatusHandler(server, useCase);
  });

  afterEach(async () => {
    await server.close();
  });

  it.each([
    [
      { change_type: "reading", ignored: "field", is_read: true },
      { fiscalCode, isRead: true, messageId },
    ],
    [
      { change_type: "archiving", is_archived: false },
      { fiscalCode, isArchived: false, messageId },
    ],
    [
      { change_type: "bulk", is_archived: true, is_read: true },
      { fiscalCode, isArchived: true, isRead: true, messageId },
    ],
    [
      { change_type: "bulk", is_archived: false },
      { fiscalCode, isArchived: false, isRead: undefined, messageId },
    ],
  ])("maps a valid status change", async (payload, expectedInput) => {
    const response = await server.inject({
      headers: xUserHeaders,
      method: "PUT",
      payload,
      url: `/api/messages/${messageId}/message-status`,
    });

    expect(response.statusCode).toBe(200);
    expect(useCase).toHaveBeenCalledWith(expectedInput);
    expect(response.json()).toEqual({
      is_archived: true,
      is_read: true,
      status: "PROCESSED",
      updated_at: "2024-02-03T04:05:06.000Z",
      version: 1,
    });
  });

  it.each([
    ["reading false", { change_type: "reading", is_read: false }],
    [
      "bulk reading false",
      { change_type: "bulk", is_archived: true, is_read: false },
    ],
    ["missing archiving flag", { change_type: "archiving" }],
    ["unknown change", { change_type: "unknown" }],
  ])("returns 400 for %s", async (_label, payload) => {
    const response = await server.inject({
      headers: xUserHeaders,
      method: "PUT",
      payload,
      url: `/api/messages/${messageId}/message-status`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(useCase).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", undefined],
    ["invalid", { "x-user": "invalid" }],
  ])("returns 400 when x-user is %s", async (_label, headers) => {
    const response = await server.inject({
      headers,
      method: "PUT",
      payload: { change_type: "reading", is_read: true },
      url: `/api/messages/${messageId}/message-status`,
    });

    expect(response.statusCode).toBe(400);
    expect(useCase).not.toHaveBeenCalled();
  });

  it.each([
    [new ForbiddenError(), 403],
    [new NotFoundError("message status", "missing"), 404],
    [new ConflictError("version exists"), 409],
    [new TooManyRequestsError(), 429],
    [new GenericError("failed"), 500],
  ])("maps domain errors to problem responses", async (error, statusCode) => {
    vi.mocked(useCase).mockResolvedValue(err(error));

    const response = await server.inject({
      headers: xUserHeaders,
      method: "PUT",
      payload: { change_type: "archiving", is_archived: true },
      url: `/api/messages/${messageId}/message-status`,
    });

    expect(response.statusCode).toBe(statusCode);
    expect(response.json().status).toBe(statusCode);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
  });

  it("keeps the rejection reason internal to the persisted status", async () => {
    vi.mocked(useCase).mockResolvedValue(
      ok({
        ...status,
        rejectionReason: "USER_NOT_FOUND",
        status: "REJECTED",
      }),
    );

    const response = await server.inject({
      headers: xUserHeaders,
      method: "PUT",
      payload: { change_type: "reading", is_read: true },
      url: `/api/messages/${messageId}/message-status`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("REJECTED");
    expect(response.json()).not.toHaveProperty("rejectionReason");
    expect(response.json()).not.toHaveProperty("rejection_reason");
  });
});
