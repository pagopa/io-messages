import { FiscalCode } from "io-messages-common/domain/fiscal-code";

import {
  AttachmentMetadataResponse,
  AttachmentName,
  CheckQrMandateRequest,
  CheckQrMandateResponse,
  DocIdx,
  Iun,
  MandateId,
  ThirdPartyMessage,
  attachmentMetadataResponseSchema,
  attachmentNameSchema,
  checkQrMandateResponseSchema,
  iunSchema,
  problemSchema,
  thirdPartyMessageSchema,
} from "./definitions.js";

export class NotificationClientError extends Error {
  body: unknown;
  name = "NotificationClientError";
  status: number;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export interface LollipopHeaders {
  signature?: string;
  "signature-input"?: string;
  "x-pagopa-cx-taxid": FiscalCode;
  "x-pagopa-lollipop-assertion-ref"?: string;
  "x-pagopa-lollipop-assertion-type"?: string;
  "x-pagopa-lollipop-auth-jwt"?: string;
  "x-pagopa-lollipop-original-method"?: string;
  "x-pagopa-lollipop-original-url"?: string;
  "x-pagopa-lollipop-public-key"?: string;
  "x-pagopa-lollipop-user-id"?: string;
  "x-pagopa-pn-io-src"?: string;
}

export default class NotificationClient {
  #apiKey: string;
  #baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.#apiKey = apiKey;
    this.#baseUrl = baseUrl;
  }

  async checkAarQrCodeIO(
    body: CheckQrMandateRequest,
    headers: LollipopHeaders,
  ): Promise<CheckQrMandateResponse> {
    try {
      const parsedHeaders = {
        ...headers,
        "content-type": "application/json",
        "x-api-key": this.#apiKey,
      };

      const response = await fetch(
        `${this.#baseUrl}/delivery/notifications/received/check-qr-code`,
        {
          body: JSON.stringify(body),
          headers: parsedHeaders,
          method: "POST",
        },
      );

      const responseJson = await response.json();

      if (!response.ok) {
        const parsedError =
          response.status === 403
            ? checkQrMandateResponseSchema.parse(responseJson)
            : problemSchema.parse(responseJson);

        throw new NotificationClientError(
          `HTTP ${response.status}`,
          response.status,
          parsedError,
        );
      }

      return checkQrMandateResponseSchema.parse(responseJson);
    } catch (error) {
      if (error instanceof NotificationClientError) throw error;
      throw new Error(
        `Error during getReceivedNotificationAttachment api call | ${error}`,
      );
    }
  }

  async getReceivedNotification(
    iun: string,
    headers: LollipopHeaders,
    mandateId?: string,
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
          `HTTP ${response.status}`,
          response.status,
          parsedError,
        );
      }

      return thirdPartyMessageSchema.parse(responseJson);
    } catch (error) {
      if (error instanceof NotificationClientError) throw error;
      throw new Error(
        `Error during getReceivedNotification api call | ${error}`,
      );
    }
  }

  async getReceivedNotificationAttachment(
    iun: string,
    attachmentName: AttachmentName,
    headers: LollipopHeaders,
    options?: { attachmentIdx?: number; mandateId?: string },
  ): Promise<AttachmentMetadataResponse> {
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
          `HTTP ${response.status}`,
          response.status,
          parsedError,
        );
      }

      return attachmentMetadataResponseSchema.parse(responseJson);
    } catch (error) {
      if (error instanceof NotificationClientError) throw error;
      throw new Error(
        `Error during getReceivedNotificationAttachment api call | ${error}`,
      );
    }
  }

  async getReceivedNotificationDocument(
    iun: Iun,
    docIdx: DocIdx,
    headers: LollipopHeaders,
    mandateId?: MandateId,
  ): Promise<AttachmentMetadataResponse> {
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
          `HTTP ${response.status}`,
          response.status,
          parsedError,
        );
      }

      return attachmentMetadataResponseSchema.parse(responseJson);
    } catch (error) {
      if (error instanceof NotificationClientError) throw error;
      throw new Error(
        `Error during getReceivedNotificationDocument api call | ${error}`,
      );
    }
  }
}
