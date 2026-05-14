import { HttpRequest, InvocationContext } from "@azure/functions";
import { QueueClient } from "@azure/storage-queue";
import { PushNotificationsContentTypeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/PushNotificationsContentType";
import * as TE from "fp-ts/TaskEither";
import { once } from "node:events";
import {
  IncomingHttpHeaders,
  IncomingMessage,
  Server,
  ServerResponse,
  createServer,
} from "node:http";
import { AddressInfo } from "node:net";

import { Notify } from "../../../functions/notify";
import { UserSessionInfo } from "../../../generated/session-manager/UserSessionInfo";
import { sendNotification as makeSendNotification } from "../../../services/notification";
import {
  MessageWithContentReader,
  ServiceReader,
  SessionStatusReader,
  UserProfileReader,
} from "../../../services/readers";
import { NOTIFY_ROUTE, READY_ROUTE } from "./scenarios";

const createHeaders = (headers: IncomingHttpHeaders): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(",") : value,
      ]),
  );

const readRequestBody = async (
  request: IncomingMessage,
): Promise<string | undefined> => {
  const chunks: Buffer[] = [];

  request.on("data", (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  await once(request, "end");

  return chunks.length > 0 ? Buffer.concat(chunks).toString("utf8") : undefined;
};

const writeResponse = async (
  response: Awaited<ReturnType<ReturnType<typeof Notify>>>,
  serverResponse: ServerResponse,
): Promise<void> => {
  serverResponse.statusCode = response.status ?? 200;

  Object.entries(response.headers ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      serverResponse.setHeader(key, value);
    }
  });

  if ("jsonBody" in response && response.jsonBody !== undefined) {
    serverResponse.end(JSON.stringify(response.jsonBody));
    return;
  }

  if ("body" in response && response.body !== undefined) {
    serverResponse.end(String(response.body));
    return;
  }

  serverResponse.end();
};

export interface NotifyRuntimeOptions {
  readonly connectionString: string;
  readonly queueName: string;
}

type ReaderValue<TReader> = TReader extends (
  ...args: readonly unknown[]
) => TE.TaskEither<unknown, infer TValue>
  ? TValue
  : never;

export class NotifyRuntime {
  private baseUrlValue?: string;
  private readonly notifyHandler: ReturnType<typeof Notify>;
  private server?: Server;

  constructor(options: NotifyRuntimeOptions) {
    const queueClient = new QueueClient(
      options.connectionString,
      options.queueName,
    );

    const retrieveUserProfile: UserProfileReader = () =>
      TE.of({
        pushNotificationsContentType: PushNotificationsContentTypeEnum.FULL,
      } as ReaderValue<UserProfileReader>);

    const retrieveUserSession: SessionStatusReader = () =>
      TE.of({ active: true } as UserSessionInfo);

    const retrieveMessageWithContent: MessageWithContentReader = (
      _fiscalCode,
      messageId,
    ) =>
      TE.of({
        content: {
          subject: "A characterization message subject",
        },
        id: messageId,
        senderServiceId: "01234567890",
      } as ReaderValue<MessageWithContentReader>);

    const retrieveService: ServiceReader = () =>
      TE.of({
        organizationName: "Organization",
        requireSecureChannels: true,
        serviceName: "Service",
      } as ReaderValue<ServiceReader>);

    const sendNotification = makeSendNotification(queueClient);

    this.notifyHandler = Notify(
      retrieveUserProfile,
      retrieveUserSession,
      retrieveMessageWithContent,
      retrieveService,
      sendNotification,
    );
  }

  async start(): Promise<void> {
    this.server = createServer(async (request, response) => {
      try {
        const runtimeUrl = new URL(request.url ?? "/", this.baseUrl);

        if (runtimeUrl.pathname === READY_ROUTE) {
          response.statusCode = 200;
          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify({ ready: true }));
          return;
        }

        if (runtimeUrl.pathname !== NOTIFY_ROUTE) {
          response.statusCode = 404;
          response.end();
          return;
        }

        const rawBody = await readRequestBody(request);
        const body = rawBody !== undefined ? { string: rawBody } : undefined;
        const functionRequest = new HttpRequest({
          body,
          headers: createHeaders(request.headers),
          method: request.method ?? "GET",
          url: runtimeUrl.toString(),
        });
        const context = new InvocationContext({
          functionName: "NotifyCharacterizationRuntime",
          logHandler: () => undefined,
        });
        const functionResponse = await this.notifyHandler(
          functionRequest,
          context,
        );

        await writeResponse(functionResponse, response);
      } catch (error) {
        response.statusCode = 500;
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            detail:
              error instanceof Error ? error.message : "Unknown runtime error",
          }),
        );
      }
    });

    this.server.listen(0, "127.0.0.1");
    await once(this.server, "listening");

    const address = this.server.address() as AddressInfo;
    this.baseUrlValue = `http://127.0.0.1:${address.port}`;
  }

  async stop(): Promise<void> {
    if (this.server === undefined) {
      return;
    }

    this.server.close();
    await once(this.server, "close");
  }

  get baseUrl(): string {
    if (this.baseUrlValue === undefined) {
      throw new Error("Notify runtime has not been started yet.");
    }

    return this.baseUrlValue;
  }
}
