import { Context } from "@azure/functions";
import { MessageModel } from "@pagopa/io-functions-commons/dist/src/models/message";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { MessageContentType } from "../../generated/avro/dto/MessageContentTypeEnum";
import { TelemetryClient } from "../../utils/appinsights";
import { ThirdPartyDataWithCategoryFetcher } from "../../utils/message";
import * as KP from "@pagopa/fp-ts-kafkajs/dist/lib/KafkaProducerCompact";
import * as messageUtils from "../../utils/message-utils";
import {
  aMessageContent,
  aRetrievedMessageWithoutContent,
} from "../../__mocks__/message";
import {
  HandleMessageChangeFeedPublishFailureHandler,
  HandleMessagePublishFailureInput,
} from "../handler";
import { vi, beforeEach, describe, test, expect } from "vitest";

const functionsContextMock = {
  bindings: {},
  done: vi.fn(),
  log: {
    error: vi.fn(),
  },
} as unknown as Context;

const telemetryClientMock = {
  trackException: vi.fn((_) => void 0),
} as unknown as TelemetryClient;

const getContentFromBlobMock = vi
  .fn()
  .mockImplementation(() => TE.of(O.some(aMessageContent)));

const mockMessageModel = {
  getContentFromBlob: getContentFromBlobMock,
} as any as MessageModel;

const inputMessage = {
  body: {
    ...aRetrievedMessageWithoutContent,
    kind: "IRetrievedMessageWithoutContent" as const,
  },
};

const aRetriableInput: HandleMessagePublishFailureInput = {
  ...inputMessage,
  retriable: true,
};

const aNotRetriableInput: HandleMessagePublishFailureInput = {
  ...inputMessage,
  retriable: false,
};

const anyParam = {} as any;

// ----------------------
// Variables
// ----------------------

const kafkaClient = {} as any;

const sendMessagesMock = vi.fn().mockImplementation((_) => TE.right([]));

vi.spyOn(KP, "sendMessages").mockImplementation((_) => sendMessagesMock);

describe("HandleMessageChangeFeedPublishFailureHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should write an avro message on kafka client", async () => {
    vi.spyOn(messageUtils, "getContentFromBlob").mockImplementation(() =>
      TE.right(O.some(aMessageContent)),
    );
    const res = await HandleMessageChangeFeedPublishFailureHandler(
      functionsContextMock,
      aRetriableInput,
      telemetryClientMock,
      mockMessageModel,
      anyParam,
      kafkaClient,
    );
    expect(res).toEqual(void 0);
    expect(telemetryClientMock.trackException).not.toHaveBeenCalled();
    expect(sendMessagesMock).toHaveBeenCalledWith([
      {
        ...inputMessage.body,
        content: aMessageContent,
        kind: "IRetrievedMessageWithContent",
      },
    ]);
  });

  test("should throw if Transient failure occurs", async () => {
    vi.spyOn(messageUtils, "getContentFromBlob").mockImplementation(() =>
      TE.right(O.none),
    );
    await expect(
      HandleMessageChangeFeedPublishFailureHandler(
        functionsContextMock,
        aRetriableInput,
        telemetryClientMock,
        mockMessageModel,
        anyParam,
        kafkaClient,
      ),
    ).rejects.toBeDefined();
    expect(telemetryClientMock.trackException).toHaveBeenCalledWith(
      expect.objectContaining({
        tagOverrides: { samplingEnabled: "true" },
      }),
    );
  });

  test("should return a Permanent failure if input decode fails", async () => {
    await expect(
      HandleMessageChangeFeedPublishFailureHandler(
        functionsContextMock,
        { wrongInput: true },
        telemetryClientMock,
        mockMessageModel,
        anyParam,
        kafkaClient,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        kind: "PERMANENT",
      }),
    );
    expect(telemetryClientMock.trackException).toHaveBeenCalled();
  });

  test("should return a Permanent failure if input is not retriable", async () => {
    await expect(
      HandleMessageChangeFeedPublishFailureHandler(
        functionsContextMock,
        aNotRetriableInput,
        telemetryClientMock,
        mockMessageModel,
        anyParam,
        kafkaClient,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        kind: "PERMANENT",
      }),
    );
    expect(telemetryClientMock.trackException).toHaveBeenCalled();
  });
});
