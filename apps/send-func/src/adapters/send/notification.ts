import {
  AarQrCodeValue,
  AttachmentMetadataResponse,
  AttachmentName,
  CheckQrMandateResponse,
  DocIdx,
  Iun,
  MandateId,
  SendHeaders,
  ThirdPartyMessage,
  attachmentMetadataResponseSchema,
  attachmentNameSchema,
  checkQrMandateRequestSchema,
  checkQrMandateResponseSchema,
  iunSchema,
  problemSchema,
  thirdPartyMessageSchema,
} from "./definitions.js";

export class NotificationClientError extends Error {
  body: unknown;
  name: string;
  status: number;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "NotificationClientError";
    this.status = status;
    this.body = body;
  }
}

export default class NotificationClient {
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

      if (!response.ok) {
        const parsedError =
          response.status === 403
            ? checkQrMandateResponseSchema.parse(responseJson)
            : problemSchema.parse(responseJson);

        throw new NotificationClientError(
          `The api responded with HTTP status ${response.status}`,
          response.status,
          parsedError,
        );
      }

      return checkQrMandateResponseSchema.parse(responseJson);
    } catch (error) {
      if (error instanceof NotificationClientError) throw error;
      throw new Error(`Error during checkAarQrCodeIO api call | ${error}`);
    }
  }

  async getReceivedNotification(
    iun: string,
    headers: SendHeaders,
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
          `The api responded with HTTP status ${response.status}`,
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
    headers: SendHeaders,
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
          `The api responded with HTTP status ${response.status}`,
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
    headers: SendHeaders,
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
          `The api responded with HTTP status ${response.status}`,
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
