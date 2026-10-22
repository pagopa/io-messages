import type { FastifyInstance } from "fastify";

import { FiscalCodeSchema, GenericError } from "@pagopa/hexagonal-core";
import fastify from "fastify";
import {
  aSignatureInput,
  anAssertionRef,
} from "io-messages-common/adapters/lollipop/__mocks__/lollipop";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GetRemoteContentMessageUseCase } from "../../../../application/use-cases/get-remote-content-message.use-case.js";

import { LollipopHeadersBuildError } from "../../../../application/ports/lc-params.js";
import { RemoteContentMessageBadGatewayError } from "../../../../application/ports/remote-content-message.js";
import { mountGetRemoteContentMessageHandler } from "../get-remote-content-message.handler.js";

const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

const userIdentity = {
  assertion_ref: anAssertionRef,
  date_of_birth: "1980-01-01",
  family_name: "Rossi",
  fiscal_code: fiscalCode,
  name: "Mario",
  spid_level: "https://www.spid.gov.it/SpidL2",
};

const toBase64 = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString("base64");

const validOutput = {
  content: {
    markdown: "a".repeat(80),
    subject: "a valid subject",
    third_party_data: {
      configuration_id: "01HAQ4HYBR5JZCS6K0DT7M1EV8",
      has_attachments: false,
      has_remote_content: true,
      id: "third-party-message-id",
    },
  },
  created_at: "2024-01-01T00:00:00.000Z",
  fiscal_code: fiscalCode,
  id: messageId,
  sender_service_id: "service-id",
  third_party_message: {
    attachments: [],
    details: {
      markdown: "b".repeat(80),
      subject: "remote subject",
    },
  },
  time_to_live: 3600,
};

describe("mountGetRemoteContentMessageHandler", () => {
  let server: FastifyInstance;
  let useCase: GetRemoteContentMessageUseCase;

  beforeEach(() => {
    server = fastify();
    useCase = vi.fn().mockResolvedValue(ok(validOutput));
    mountGetRemoteContentMessageHandler(server, useCase);
  });

  afterEach(async () => {
    await server.close();
  });

  it("maps a valid request using the x-user fiscal code", async () => {
    const response = await server.inject({
      headers: {
        "x-user": toBase64(userIdentity),
      },
      method: "GET",
      url: `/api/v1/third-party-messages/${messageId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(useCase).toHaveBeenCalledWith({
      assertionRef: anAssertionRef,
      fiscalCode,
      lollipopRequestHeaders: undefined,
      messageId,
    });
    expect(response.json()).toEqual(validOutput);
  });

  it("forwards client Lollipop request headers separately from x-user assertion_ref", async () => {
    const requestHeaders = {
      signature: "sig1=:YQ==:",
      "signature-input": aSignatureInput,
      "x-pagopa-lollipop-original-method": "GET",
      "x-pagopa-lollipop-original-url": "https://api.example.com/messages",
    };

    const response = await server.inject({
      headers: {
        ...requestHeaders,
        "x-user": toBase64(userIdentity),
      },
      method: "GET",
      url: `/api/v1/third-party-messages/${messageId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(useCase).toHaveBeenCalledWith({
      assertionRef: anAssertionRef,
      fiscalCode,
      lollipopRequestHeaders: requestHeaders,
      messageId,
    });
  });

  it("preserves SEND-specific message fields in the response", async () => {
    const sendMessage = {
      attachments: [
        {
          category: "DOCUMENT",
          id: "send-document",
          name: "notice.pdf",
          size: 123,
          url: "/delivery/notifications/received/iun/attachments/documents/0",
        },
      ],
      details: {
        abstract: "Notification abstract",
        iun: "notification-iun",
        notificationStatusHistory: [],
        recipients: [],
        subject: "SEND subject",
      },
    };
    vi.mocked(useCase).mockResolvedValueOnce(
      ok({ ...validOutput, third_party_message: sendMessage }),
    );

    const response = await server.inject({
      headers: {
        "x-user": toBase64(userIdentity),
      },
      method: "GET",
      url: `/api/v1/third-party-messages/${messageId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().third_party_message).toEqual(sendMessage);
  });

  it("returns 400 and does not call the use case when x-user is missing", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/third-party-messages/${messageId}`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(useCase).not.toHaveBeenCalled();
  });

  it("maps invalid upstream remote content to 502", async () => {
    vi.mocked(useCase).mockResolvedValue(
      err(
        new RemoteContentMessageBadGatewayError("REMOTE_CONTENT_NOT_PRESENT"),
      ),
    );

    const response = await server.inject({
      headers: {
        "x-user": toBase64(userIdentity),
      },
      method: "GET",
      url: `/api/v1/third-party-messages/${messageId}`,
    });

    expect(response.statusCode).toBe(502);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(response.json()).toMatchObject({
      detail: "Bad Gateway: REMOTE_CONTENT_NOT_PRESENT",
      status: 502,
    });
  });

  it("maps generic errors to 500", async () => {
    vi.mocked(useCase).mockResolvedValue(err(new GenericError("failed")));

    const response = await server.inject({
      headers: {
        "x-user": toBase64(userIdentity),
      },
      method: "GET",
      url: `/api/v1/third-party-messages/${messageId}`,
    });

    expect(response.statusCode).toBe(500);
  });

  it("maps Lollipop header extraction failures to the internal error contract", async () => {
    vi.mocked(useCase).mockResolvedValue(
      err(new LollipopHeadersBuildError("Error extracting lollipop locals")),
    );

    const response = await server.inject({
      headers: {
        "x-user": toBase64(userIdentity),
      },
      method: "GET",
      url: `/api/v1/third-party-messages/${messageId}`,
    });

    expect(response.statusCode).toBe(500);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(response.json()).toMatchObject({
      detail: "Error extracting lollipop locals",
      status: 500,
      title: "Internal server error",
    });
  });
});
