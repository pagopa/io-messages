import type { FastifyInstance } from "fastify";

import { ForbiddenError, GenericError } from "@pagopa/hexagonal-core";
import fastify from "fastify";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GetRemoteContentMessagePreconditionUseCase } from "../../../../application/use-cases/get-remote-content-message-precondition.use-case.js";

import { mountGetRemoteContentMessagePreconditionHandler } from "../get-remote-content-message-precondition.handler.js";

const messageId = "01JAQ4HYBR5JZCS6K0DT7M1EV8";
const url = `/api/communication/v1/third-party-messages/${messageId}/precondition`;
const precondition = { markdown: "a precondition", title: "a title" };

const xUser = Buffer.from(
  JSON.stringify({
    date_of_birth: "1980-01-01",
    family_name: "Rossi",
    fiscal_code: "RSSMRA80A01H501U",
    name: "Mario",
    spid_level: "https://www.spid.gov.it/SpidL2",
  }),
).toString("base64");

describe("mountGetRemoteContentMessagePreconditionHandler", () => {
  let server: FastifyInstance;
  let useCase: GetRemoteContentMessagePreconditionUseCase;

  beforeEach(() => {
    server = fastify();
    useCase = vi.fn().mockResolvedValue(ok(precondition));
    mountGetRemoteContentMessagePreconditionHandler(server, useCase);
  });

  afterEach(async () => {
    await server.close();
  });

  it("returns the precondition for an authenticated user", async () => {
    const response = await server.inject({
      headers: { "x-user": xUser },
      method: "GET",
      url,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(precondition);
    expect(useCase).toHaveBeenCalledWith({
      assertionRef: undefined,
      fiscalCode: "RSSMRA80A01H501U",
      lollipopRequestHeaders: expect.objectContaining({ "x-user": xUser }),
      messageId,
    });
  });

  it("passes malformed lollipop headers to the use case without rejecting the request", async () => {
    const response = await server.inject({
      headers: { signature: "malformed", "x-user": xUser },
      method: "GET",
      url,
    });

    expect(response.statusCode).toBe(200);
    expect(useCase).toHaveBeenCalledWith(
      expect.objectContaining({
        lollipopRequestHeaders: expect.objectContaining({
          signature: "malformed",
        }),
      }),
    );
  });

  it("rejects a request without the x-user header", async () => {
    const response = await server.inject({ method: "GET", url });

    expect(response.statusCode).toBe(400);
    expect(useCase).not.toHaveBeenCalled();
  });

  it("rejects an invalid message id", async () => {
    const response = await server.inject({
      headers: { "x-user": xUser },
      method: "GET",
      url: "/api/communication/v1/third-party-messages/not-a-ulid/precondition",
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps use case errors to HTTP errors", async () => {
    vi.mocked(useCase).mockResolvedValue(err(new ForbiddenError()));

    const response = await server.inject({
      headers: { "x-user": xUser },
      method: "GET",
      url,
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps Lollipop internal errors to HTTP 500", async () => {
    vi.mocked(useCase).mockResolvedValue(
      err(new GenericError("Lollipop error")),
    );

    const response = await server.inject({
      headers: { "x-user": xUser },
      method: "GET",
      url,
    });

    expect(response.statusCode).toBe(500);
  });
});
