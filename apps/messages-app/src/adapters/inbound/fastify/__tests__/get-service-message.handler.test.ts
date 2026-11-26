import type { FastifyInstance } from "fastify";

import { ForbiddenError, GenericError } from "@pagopa/hexagonal-core";
import fastify from "fastify";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GetServiceMessageUseCase } from "../../../../application/use-cases/get-service-message.use-case.js";

import { MalformedEntityError } from "../../../../application/ports/error.js";
import { mountGetServiceMessageHandler } from "../get-service-message.handler.js";

const fiscalCode = "RSSMRA80A01H501U";
const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const validHeaders = {
  "x-service-id": "service-id",
  "x-subscription-id": "subscription-id",
  "x-user-groups": "ApiMessageRead,ApiMessageReadAdvanced",
  "x-user-id": "user-id",
};
const responseBody = {
  message: {
    created_at: "2024-01-01T00:00:00.000Z",
    feature_level_type: "ADVANCED" as const,
    fiscal_code: fiscalCode,
    id: messageId,
    sender_service_id: "service-id",
    time_to_live: 3600,
  },
  read_status: "UNREAD" as const,
  status: "PROCESSED" as const,
};

describe("mountGetServiceMessageHandler", () => {
  let server: FastifyInstance;
  let useCase: GetServiceMessageUseCase;

  beforeEach(() => {
    server = fastify();
    useCase = vi.fn().mockResolvedValue(ok(responseBody));
    mountGetServiceMessageHandler(server, useCase);
  });

  afterEach(async () => server.close());

  it("maps trusted caller headers and returns the service response", async () => {
    const response = await server.inject({
      headers: validHeaders,
      method: "GET",
      url: `/api/services/messages/${fiscalCode}/${messageId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(responseBody);
    expect(useCase).toHaveBeenCalledWith({
      fiscalCode,
      groups: new Set(["ApiMessageRead", "ApiMessageReadAdvanced"]),
      messageId,
      serviceId: "service-id",
      subscriptionId: "subscription-id",
    });
  });

  it.each(["x-user-id", "x-subscription-id", "x-user-groups"] as const)(
    "returns 403 when the authentication header %s is missing",
    async (header) => {
      const headers = Object.fromEntries(
        Object.entries(validHeaders).filter(([name]) => name !== header),
      );
      const response = await server.inject({
        headers,
        method: "GET",
        url: `/api/services/messages/${fiscalCode}/${messageId}`,
      });

      expect(response.statusCode).toBe(403);
      expect(useCase).not.toHaveBeenCalled();
    },
  );

  it.each(["ApiMessageWrite", "ApiMessageReadAdvanced", ""])(
    "returns 403 for groups %s before validating the request",
    async (groups) => {
      const response = await server.inject({
        headers: { ...validHeaders, "x-user-groups": groups },
        method: "GET",
        url: `/api/services/messages/invalid-fiscal-code/${messageId}`,
      });

      expect(response.statusCode).toBe(403);
      expect(useCase).not.toHaveBeenCalled();
    },
  );

  it("returns 400 for an invalid path when authorization succeeds", async () => {
    const response = await server.inject({
      headers: validHeaders,
      method: "GET",
      url: `/api/services/messages/invalid-fiscal-code/${messageId}`,
    });

    expect(response.statusCode).toBe(400);
    expect(useCase).not.toHaveBeenCalled();
  });

  it("returns 400 when the service id is missing after authorization succeeds", async () => {
    const headers = Object.fromEntries(
      Object.entries(validHeaders).filter(([name]) => name !== "x-service-id"),
    );
    const response = await server.inject({
      headers,
      method: "GET",
      url: `/api/services/messages/${fiscalCode}/${messageId}`,
    });

    expect(response.statusCode).toBe(400);
    expect(useCase).not.toHaveBeenCalled();
  });

  it("maps ownership failures to 403", async () => {
    vi.mocked(useCase).mockResolvedValueOnce(err(new ForbiddenError()));

    const response = await server.inject({
      headers: {
        ...validHeaders,
        "x-service-id": "another-service",
      },
      method: "GET",
      url: `/api/services/messages/${fiscalCode}/${messageId}`,
    });

    expect(response.statusCode).toBe(403);
  });

  it.each([
    ["generic", new GenericError("authorization failed")],
    ["malformed", new MalformedEntityError("invalid user profile")],
  ])("maps %s authorization failures to 500", async (_, error) => {
    vi.mocked(useCase).mockResolvedValueOnce(err(error));

    const response = await server.inject({
      headers: validHeaders,
      method: "GET",
      url: `/api/services/messages/${fiscalCode}/${messageId}`,
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      status: 500,
      title: "Internal Server Error",
    });
  });
});
