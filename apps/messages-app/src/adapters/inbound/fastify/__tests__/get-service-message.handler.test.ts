import type { FastifyInstance } from "fastify";

import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import fastify from "fastify";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ServicesCmsDetail,
  ServicesCmsRepository,
} from "../../../../application/ports/services-cms.js";
import type { GetServiceMessageUseCase } from "../../../../application/use-cases/get-service-message.use-case.js";

import { MalformedEntityError } from "../../../../application/ports/error.js";
import { makeGetMessageForServiceUseCase } from "../../../../application/use-cases/get-service-message.use-case.js";
import { mountGetServiceMessageHandler } from "../get-service-message.handler.js";

const fiscalCode = "RSSMRA80A01H501U";
const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const validHeaders = {
  "x-forwarded-for": "192.0.2.10",
  "x-subscription-id": "subscription-id",
  "x-user-email": "user@example.com",
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
const service: ServicesCmsDetail = {
  authorized_cidrs: ["192.0.2.0/24"],
  authorized_recipients: [],
  description: "Service description",
  id: "service-id",
  last_update: "2026-01-01T00:00:00.000Z",
  max_allowed_payment_amount: 10_000,
  metadata: { scope: "NATIONAL" },
  name: "Service",
  organization: { fiscal_code: "01234567890", name: "Organization" },
  require_secure_channel: false,
  status: { value: "published" },
};

let server: FastifyInstance;
let useCase: GetServiceMessageUseCase;
let repository: ServicesCmsRepository;

beforeEach(() => {
  server = fastify();
  useCase = vi.fn().mockResolvedValue(ok(responseBody));
  repository = {
    getServiceCmsDetails: vi.fn().mockResolvedValue(ok(service)),
    getServicesCmsDetailsByServiceIds: vi.fn(),
  };
  mountGetServiceMessageHandler(server, useCase, repository);
});

afterEach(async () => server.close());

describe("mountGetServiceMessageHandler", () => {
  it("maps the resolved service without requiring x-service-id", async () => {
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

  it("ignores an x-service-id that differs from the resolved service", async () => {
    const response = await server.inject({
      headers: { ...validHeaders, "x-service-id": "another-service" },
      method: "GET",
      url: `/api/services/messages/${fiscalCode}/${messageId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(useCase).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: service.id }),
    );
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

describe("GetMessageForService authorization pipeline", () => {
  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["invalid", "invalid-email"],
  ])(
    "returns 500 for a %s user email before service lookup",
    async (_, email) => {
      const headers: Record<string, string> = { ...validHeaders };
      if (email === undefined) {
        delete headers["x-user-email"];
      } else {
        headers["x-user-email"] = email;
      }

      const response = await server.inject({
        headers,
        method: "GET",
        url: `/api/services/messages/invalid-fiscal-code/${messageId}`,
      });

      expect(response.statusCode).toBe(500);
      expect(repository.getServiceCmsDetails).not.toHaveBeenCalled();
      expect(useCase).not.toHaveBeenCalled();
    },
  );

  it.each(["", "invalid-ip"])(
    "returns 500 for an unextractable IP %j even with an empty allowlist",
    async (ip) => {
      vi.mocked(repository.getServiceCmsDetails).mockResolvedValue(
        ok({ ...service, authorized_cidrs: [] }),
      );
      const response = await server.inject({
        headers: { ...validHeaders, "x-forwarded-for": ip },
        method: "GET",
        url: `/api/services/messages/${fiscalCode}/${messageId}`,
      });

      expect(response.statusCode).toBe(500);
      expect(repository.getServiceCmsDetails).not.toHaveBeenCalled();
      expect(useCase).not.toHaveBeenCalled();
    },
  );

  it("extracts the IP before validating the email and resolving the service", async () => {
    const headers = Object.fromEntries(
      Object.entries(validHeaders).filter(
        ([name]) => name !== "x-forwarded-for",
      ),
    );
    const response = await server.inject({
      headers: { ...headers, "x-user-email": "invalid-email" },
      method: "GET",
      url: `/api/services/messages/invalid-fiscal-code/${messageId}`,
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().detail).toContain(
      "IP address cannot be extracted from the request",
    );
    expect(repository.getServiceCmsDetails).not.toHaveBeenCalled();
    expect(useCase).not.toHaveBeenCalled();
  });

  it.each([
    ["absent", new NotFoundError("service", "Service not found"), 403],
    ["unavailable", new GenericError("Service lookup failed"), 500],
    ["malformed", new MalformedEntityError("Invalid service"), 500],
    ["throttled", new TooManyRequestsError(), 500],
  ])(
    "rejects a %s service before request validation",
    async (_, error, status) => {
      vi.mocked(repository.getServiceCmsDetails).mockResolvedValue(err(error));
      const response = await server.inject({
        headers: validHeaders,
        method: "GET",
        url: `/api/services/messages/invalid-fiscal-code/${messageId}`,
      });

      expect(response.statusCode).toBe(status);
      expect(useCase).not.toHaveBeenCalled();
    },
  );

  it.each([fiscalCode, "invalid-fiscal-code"])(
    "returns 403 for a disallowed IP before validating fiscal code %s",
    async (pathFiscalCode) => {
      const response = await server.inject({
        headers: { ...validHeaders, "x-forwarded-for": "198.51.100.10" },
        method: "GET",
        url: `/api/services/messages/${pathFiscalCode}/${messageId}`,
      });

      expect(response.statusCode).toBe(403);
      expect(useCase).not.toHaveBeenCalled();
    },
  );

  it("allows a valid IP outside any range when the allowlist is empty", async () => {
    vi.mocked(repository.getServiceCmsDetails).mockResolvedValue(
      ok({ ...service, authorized_cidrs: [] }),
    );
    const response = await server.inject({
      headers: { ...validHeaders, "x-forwarded-for": "198.51.100.10" },
      method: "GET",
      url: `/api/services/messages/${fiscalCode}/${messageId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(useCase).toHaveBeenCalledOnce();
  });
});

describe("GetMessageForService dependency throttling", () => {
  it.each(["metadata", "content", "status"] as const)(
    "returns HTTP 500 for throttled %s reads",
    async (resource) => {
      const metadataRepository = {
        createMessageMetadata: vi.fn(),
        getMessageMetadata: vi.fn().mockResolvedValue(
          ok({
            createdAt: "2024-01-01T00:00:00.000Z",
            featureLevelType: "STANDARD",
            fiscalCode,
            id: messageId,
            indexedId: messageId,
            isPending: false,
            senderServiceId: service.id,
            senderUserId: "user-id",
            timeToLiveSeconds: 3600,
          }),
        ),
        getMessagesMetadataByUser: vi.fn(),
      };
      const contentRepository = {
        getMessageContentById: vi
          .fn()
          .mockResolvedValue(err(new NotFoundError("content", "not found"))),
        getMessagesContentByIds: vi.fn(),
      };
      const statusRepository = {
        createMessageStatus: vi.fn(),
        getLatestMessageStatusById: vi
          .fn()
          .mockResolvedValue(err(new NotFoundError("status", "not found"))),
        getLatestMessagesStatusByIds: vi.fn(),
      };
      const throttlingError = new TooManyRequestsError();
      if (resource === "metadata") {
        metadataRepository.getMessageMetadata.mockResolvedValueOnce(
          err(throttlingError),
        );
      } else if (resource === "content") {
        contentRepository.getMessageContentById.mockResolvedValueOnce(
          err(throttlingError),
        );
      } else {
        statusRepository.getLatestMessageStatusById.mockResolvedValueOnce(
          err(throttlingError),
        );
      }

      vi.mocked(useCase).mockImplementationOnce(
        makeGetMessageForServiceUseCase(
          metadataRepository,
          statusRepository,
          contentRepository,
          { getProfile: vi.fn() },
          { getServicePreferences: vi.fn() },
          { getPaymentStatus: vi.fn() },
          "2.0.0",
        ),
      );

      const response = await server.inject({
        headers: validHeaders,
        method: "GET",
        url: `/api/services/messages/${fiscalCode}/${messageId}`,
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toMatchObject({
        detail: expect.stringContaining(throttlingError.message),
        status: 500,
      });
    },
  );
});
