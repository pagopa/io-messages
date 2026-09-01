import type { FastifyInstance } from "fastify";

import { ForbiddenError } from "@pagopa/hexagonal-core";
import fastify from "fastify";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GetServiceMessageUseCase } from "../../../../application/use-cases/get-service-message.use-case.js";

import { mountGetServiceMessageHandler } from "../get-service-message.handler.js";

const fiscalCode = "RSSMRA80A01H501U";
const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
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
      headers: {
        "x-service-id": "service-id",
        "x-subscription-id": "subscription-id",
        "x-user-groups": "ApiMessageRead, ApiMessageReadAdvanced",
      },
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

  it("returns 400 when a trusted caller header is missing", async () => {
    const response = await server.inject({
      headers: {
        "x-service-id": "service-id",
        "x-user-groups": "ApiMessageRead",
      },
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
        "x-service-id": "another-service",
        "x-subscription-id": "subscription-id",
        "x-user-groups": "ApiMessageRead",
      },
      method: "GET",
      url: `/api/services/messages/${fiscalCode}/${messageId}`,
    });

    expect(response.statusCode).toBe(403);
  });
});
