import {
  AarQrCodeValue,
  AttachmentMetadata,
  AttachmentName,
  CheckQrMandateResponse,
  Idx,
  Iun,
  MandateId,
  NotificationClient,
  SendHeaders,
  ThirdPartyMessage,
  attachmentMetadataSchema,
  attachmentNameSchema,
  checkQrMandateResponseSchema,
  iunSchema,
  thirdPartyMessageSchema,
} from "@/domain/notification.js";

import {
  Problem,
  checkQrMandateRequestSchema,
  problemSchema,
} from "./definitions.js";
import z, { ZodError } from "zod/v4";

export class NotRecipientClientError extends Error {
  body: CheckQrMandateResponse;
  name: string;

  constructor(message: string, body: CheckQrMandateResponse) {
    super(message);
    this.name = "NotRecipientClientError";
    this.body = body;
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

export default class SendNotificationClient implements NotificationClient {
  #apiKey: string;
  #baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.#apiKey = apiKey;
    this.#baseUrl = baseUrl;
  }

  async checkAarQrCodeIO(
    aarQrCodeValue: AarQrCodeValue,
    headers: SendHeaders,
  ): Promise<CheckQrMandateResponse> {
    try {
      const parsedHeaders = {
        ...headers,
        "content-type": "application/json",
        "x-api-key": this.#apiKey,
      };

      const body = checkQrMandateRequestSchema.parse({ aarQrCodeValue });

      const response = await fetch(
        `${this.#baseUrl}/delivery/notifications/received/check-qr-code`,
        {
          body: JSON.stringify(body),
          headers: parsedHeaders,
          method: "POST",
        },
      );

      const responseJson = await response.json();

      if (response.status === 403) {
        const parsedError = checkQrMandateResponseSchema.parse(responseJson);

        throw new NotRecipientClientError(
          `The api responded with HTTP status ${response.status}`,
          parsedError,
        );
      }

      if (response.status === 403) {
        const parsedError = checkQrMandateResponseSchema.parse(responseJson);

        throw new NotRecipientClientError(
          `The api responded with HTTP status ${response.status}`,
          parsedError,
        );
      }

      if (!response.ok) {
        const problem = problemSchema.parse(responseJson);

        throw new NotificationClientError(
          `The api responded with HTTP status ${response.status}`,
          response.status,
          problem,
        );
      }

      return checkQrMandateResponseSchema.parse(responseJson);
    } catch (error) {
      if (
        error instanceof NotificationClientError ||
        error instanceof NotRecipientClientError
      )
        throw error;

      const errorMessage =
        error instanceof ZodError ? z.prettifyError(error) : (error instanceof Error ? error.message : JSON.stringify(error));
      throw new Error(
        `Error during checkAarQrCodeIO api call | ${errorMessage}`,
      );
    }
  }

  async getReceivedNotification(
    iun: string,
    headers: SendHeaders,
    mandateId?: MandateId,
  ): Promise<ThirdPartyMessage> {
    try {
      const parsedIun = iunSchema.parse(iun);
      const parsedHeaders = {
        ...headers,
        "content-type": "application/json",
        "x-api-key": this.#apiKey,
      };

      const url = new URL(
        `${this.#baseUrl}/delivery/notifications/received/${parsedIun}`,
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
        const parsedError = problemSchema.parse(responseJson);

        throw new NotificationClientError(
          `The api responded with HTTP status ${response.status}`,
          response.status,
          parsedError,
        );
      }

      return thirdPartyMessageSchema.parse(responseJson);
    } catch (error) {
      if (error instanceof NotificationClientError) throw error;
      const errorMessage =
        error instanceof ZodError ? z.prettifyError(error) : (error instanceof Error ? error.message : JSON.stringify(error));
      throw new Error(
        `Error during getReceivedNotification api call | ${errorMessage}`,
      );
    }
  }

  async getReceivedNotificationAttachment(
    iun: string,
    attachmentName: AttachmentName,
    headers: SendHeaders,
    options?: { attachmentIdx?: number; mandateId?: MandateId },
  ): Promise<AttachmentMetadata> {
    try {
      const parsedIun = iunSchema.parse(iun);
      const parsedAttachmentName = attachmentNameSchema.parse(attachmentName);
      const parsedHeaders = {
        ...headers,
        "content-type": "application/json",
        "x-api-key": this.#apiKey,
      };

      const url = new URL(
        `${this.#baseUrl}/delivery/notifications/received/${parsedIun}/attachments/payment/${parsedAttachmentName}`,
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
        const parsedError = problemSchema.parse(responseJson);

        throw new NotificationClientError(
          `The api responded with HTTP status ${response.status}`,
          response.status,
          parsedError,
        );
      }

      return attachmentMetadataSchema.parse(responseJson);
    } catch (error) {
      if (error instanceof NotificationClientError) throw error;
      const errorMessage =
        error instanceof ZodError ? z.prettifyError(error) : (error instanceof Error ? error.message : JSON.stringify(error));
      throw new Error(
        `Error during getReceivedNotificationAttachment api call | ${errorMessage}`,
      );
    }
  }

  async getReceivedNotificationDocument(
    iun: Iun,
    docIdx: Idx,
    headers: SendHeaders,
    mandateId?: MandateId,
  ): Promise<AttachmentMetadata> {
    try {
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
        const parsedError = problemSchema.parse(responseJson);

        throw new NotificationClientError(
          `The api responded with HTTP status ${response.status}`,
          response.status,
          parsedError,
        );
      }

      return attachmentMetadataSchema.parse(responseJson);
    } catch (error) {
      if (error instanceof NotificationClientError) throw error;
      const errorMessage =
        error instanceof ZodError ? z.prettifyError(error) : (error instanceof Error ? error.message : JSON.stringify(error));
      throw new Error(
        `Error during getReceivedNotificationDocument api call | ${errorMessage}`,
      );
    }
  }
}
