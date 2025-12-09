import {
  AarQrCodeValue,
  AttachmentMetadata,
  AttachmentName,
  CIEValidationData,
  CheckQrMandateResponse,
  Idx,
  Iun,
  MandateCreationResponse,
  MandateId,
  NotificationClient,
  SendHeaders,
  ThirdPartyMessage,
  attachmentMetadataSchema,
  checkQrMandateResponseSchema,
  mandateCreationResponseSchema,
  thirdPartyMessageSchema,
} from "@/domain/notification.js";
import * as z from "zod";

import { Problem, authErrorSchema, problemSchema } from "./definitions.js";

export class NotRecipientClientError extends Error {
  body: CheckQrMandateResponse;
  name: string;

  constructor(message: string, body: CheckQrMandateResponse) {
    super(message);
    this.name = "NotRecipientClientError";
    this.body = body;
  }
}

export class NotificationCLientAuthError extends Error {
  name: string;
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "NotificationClientAuthError";
    this.status = status;
  }
}

export class NotificationClientError extends Error {
  body: Problem;
  name: string;
  status: number;

  constructor(message: string, status: number, body: Problem) {
    super(message);
    this.name = "NotificationClientError";
    this.status = status;
    this.body = body;
  }
}

const unsuccessfulResponseToProblem = (
  responseJson: unknown,
  response: Response,
): Problem => {
  const parsedProblem = problemSchema.safeParse(responseJson);
  return parsedProblem.success
    ? parsedProblem.data
    : {
        status: response.status,
        unexpectedResponseData: JSON.stringify(responseJson), //critical part if the data are sensitive
      };
};

export default class SendNotificationClient implements NotificationClient {
  #apiKey: string;
  #baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.#apiKey = apiKey;
    this.#baseUrl = baseUrl;
  }

  async acceptNotificationMandate(
    mandateId: MandateId,
    CIEValidationdata: CIEValidationData,
    headers: SendHeaders,
  ): Promise<void> {
    const parsedHeaders = {
      ...headers,
      "content-type": "application/json",
      "x-api-key": this.#apiKey,
    };

    const url = new URL(
      `${this.#baseUrl}/mandate/api/v1/io/mandate/${mandateId}/cie/accept`,
    );

    const response = await fetch(url.toString(), {
      body: JSON.stringify(CIEValidationdata),
      headers: parsedHeaders,
      method: "PATCH",
    });

    if (!response.ok) {
      const responseJson = await response.json();
      if (response.status === 401 || response.status === 403) {
        const parsedProblem = authErrorSchema.safeParse(responseJson);

        if (!parsedProblem.success) {
          throw new NotificationClientError(
            `The api responded with HTTP status ${response.status}`,
            response.status,
            {
              detail: JSON.stringify(z.flattenError(parsedProblem.error)),
              status: response.status,
            },
          );
        }

        throw new NotificationCLientAuthError(
          parsedProblem.data.message,
          response.status,
        );
      }

      const problem = unsuccessfulResponseToProblem(responseJson, response);
      throw new NotificationClientError(
        `The api responded with HTTP status ${response.status}`,
        response.status,
        problem,
      );
    }

    return;
  }

  async checkAarQrCodeIO(
    aarQrCodeValue: AarQrCodeValue,
    headers: SendHeaders,
  ): Promise<CheckQrMandateResponse> {
    const parsedHeaders = {
      ...headers,
      "content-type": "application/json",
      "x-api-key": this.#apiKey,
    };

    const response = await fetch(
      `${this.#baseUrl}/delivery/notifications/received/check-qr-code`,
      {
        body: JSON.stringify({ aarQrCodeValue }),
        headers: parsedHeaders,
        method: "POST",
      },
    );

    const responseJson = await response.json();

    if (response.status === 403) {
      const parsedError = checkQrMandateResponseSchema.safeParse(responseJson);

      if (!parsedError.success) {
        throw new NotificationClientError(
          `The api responded with HTTP status ${response.status}`,
          response.status,
          unsuccessfulResponseToProblem(responseJson, response),
        );
      }
      throw new NotRecipientClientError(
        `The api responded with HTTP status ${response.status}`,
        parsedError.data,
      );
    }

    if (!response.ok) {
      throw new NotificationClientError(
        `The api responded with HTTP status ${response.status}`,
        response.status,
        unsuccessfulResponseToProblem(responseJson, response),
      );
    }

    const parsedResponse = checkQrMandateResponseSchema.safeParse(responseJson);
    if (!parsedResponse.success) {
      const errorMessage = JSON.stringify(z.flattenError(parsedResponse.error));
      throw new Error(
        `Error during checkAarQrCodeIO api call | ${errorMessage}`,
      );
    }

    return parsedResponse.data;
  }

  async createNotificationMandate(
    aarQrCodeValue: AarQrCodeValue,
    headers: SendHeaders,
  ): Promise<MandateCreationResponse> {
    const parsedHeaders = {
      ...headers,
      "content-type": "application/json",
      "x-api-key": this.#apiKey,
    };

    const url = new URL(`${this.#baseUrl}/mandate/api/v1/io/mandate`);

    const response = await fetch(url.toString(), {
      body: JSON.stringify({ aarQrCodeValue }),
      headers: parsedHeaders,
      method: "POST",
    });

    const responseJson = await response.json();

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        const parsedProblem = authErrorSchema.safeParse(responseJson);

        if (!parsedProblem.success) {
          throw new NotificationClientError(
            `The api responded with HTTP status ${response.status}`,
            response.status,
            unsuccessfulResponseToProblem(responseJson, response),
          );
        }

        throw new NotificationCLientAuthError(
          parsedProblem.data.message,
          response.status,
        );
      }

      throw new NotificationClientError(
        `The api responded with HTTP status ${response.status}`,
        response.status,
        unsuccessfulResponseToProblem(responseJson, response),
      );
    }

    const parsedResponse =
      mandateCreationResponseSchema.safeParse(responseJson);

    if (!parsedResponse.success) {
      const errorMessage = JSON.stringify(z.flattenError(parsedResponse.error));
      throw new Error(
        `Error during createNotificationMandate api call | ${errorMessage}`,
      );
    }

    return parsedResponse.data;
  }

  async getReceivedNotification(
    iun: Iun,
    headers: SendHeaders,
    mandateId?: MandateId,
  ): Promise<ThirdPartyMessage> {
    const parsedHeaders = {
      ...headers,
      "content-type": "application/json",
      "x-api-key": this.#apiKey,
    };

    const url = new URL(
      `${this.#baseUrl}/delivery/notifications/received/${iun}`,
    );
    if (mandateId) {
      url.searchParams.append("mandateId", mandateId);
    }

    const response = await fetch(url.toString(), {
      headers: parsedHeaders,
      method: "GET",
    });

    const responseJson = await response.json();

    if (!response.ok) {
      throw new NotificationClientError(
        `The api responded with HTTP status ${response.status}`,
        response.status,
        unsuccessfulResponseToProblem(responseJson, response),
      );
    }

    const parsedResponse = thirdPartyMessageSchema.safeParse(responseJson);
    if (!parsedResponse.success) {
      const errorMessage = JSON.stringify(z.flattenError(parsedResponse.error));
      throw new Error(
        `Error during getReceivedNotification api call | ${errorMessage}`,
      );
    }

    return parsedResponse.data;
  }

  async getReceivedNotificationAttachment(
    iun: Iun,
    attachmentName: AttachmentName,
    headers: SendHeaders,
    options?: { attachmentIdx?: number; mandateId?: MandateId },
  ): Promise<AttachmentMetadata> {
    const parsedHeaders = {
      ...headers,
      "content-type": "application/json",
      "x-api-key": this.#apiKey,
    };

    const url = new URL(
      `${this.#baseUrl}/delivery/notifications/received/${iun}/attachments/payment/${attachmentName}`,
    );

    if (options?.attachmentIdx !== undefined) {
      url.searchParams.append(
        "attachmentIdx",
        options.attachmentIdx.toString(),
      );
    }

    if (options?.mandateId) {
      url.searchParams.append("mandateId", options.mandateId);
    }

    const response = await fetch(url.toString(), {
      headers: parsedHeaders,
      method: "GET",
    });

    const responseJson = await response.json();

    if (!response.ok) {
      throw new NotificationClientError(
        `The api responded with HTTP status ${response.status}`,
        response.status,
        unsuccessfulResponseToProblem(responseJson, response),
      );
    }

    const parsedResponse = attachmentMetadataSchema.safeParse(responseJson);
    if (!parsedResponse.success) {
      const errorMessage = JSON.stringify(z.flattenError(parsedResponse.error));
      throw new Error(
        `Error during getReceivedNotificationAttachment api call | ${errorMessage}`,
      );
    }

    return parsedResponse.data;
  }

  async getReceivedNotificationDocument(
    iun: Iun,
    docIdx: Idx,
    headers: SendHeaders,
    mandateId?: MandateId,
  ): Promise<AttachmentMetadata> {
    const parsedHeaders = {
      ...headers,
      "content-type": "application/json",
      "x-api-key": this.#apiKey,
    };

    const url = new URL(
      `${this.#baseUrl}/delivery/notifications/received/${iun}/attachments/documents/${docIdx}`,
    );
    if (mandateId) {
      url.searchParams.append("mandateId", mandateId);
    }

    const response = await fetch(url.toString(), {
      headers: parsedHeaders,
      method: "GET",
    });

    const responseJson = await response.json();

    if (!response.ok) {
      throw new NotificationClientError(
        `The api responded with HTTP status ${response.status}`,
        response.status,
        unsuccessfulResponseToProblem(responseJson, response),
      );
    }

    const parsedResponse = attachmentMetadataSchema.safeParse(responseJson);
    if (!parsedResponse.success) {
      const errorMessage = JSON.stringify(z.flattenError(parsedResponse.error));
      throw new Error(
        `Error during getReceivedNotificationDocument api call | ${errorMessage}`,
      );
    }

    return parsedResponse.data;
  }
}
