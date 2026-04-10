import { InvocationContext } from "@azure/functions";
import * as KP from "@pagopa/fp-ts-kafkajs/dist/lib/KafkaProducerCompact";
import * as TE from "fp-ts/lib/TaskEither";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  aMessageContent,
  aRetrievedMessageWithoutContent,
} from "../../../__mocks__/message";
import { TelemetryClient } from "../../../utils/appinsights";
import {
  HandleMessageChangeFeedPublishFailureHandler,
  HandleMessagePublishFailureInput,
} from "../handler";

const functionsContextMock = {
  bindings: {},
  done: vi.fn(),
  error: vi.fn(),
} as unknown as InvocationContext;

const telemetryClientMock = {
  trackException: vi.fn((_) => void 0),
} as unknown as TelemetryClient;

const getByMessageContentByIdMock = vi.fn().mockResolvedValue(aMessageContent);
const mockMessageContentRepository = {
  getByMessageContentById: getByMessageContentByIdMock,
};

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

// ----------------------
// Variables
// ----------------------

const kafkaClient = {} as any;

const sendMessagesMock = vi.fn().mockImplementation((_) => TE.right([]));

vi.spyOn(KP, "sendMessages").mockImplementation((_) => sendMessagesMock);

describe("HandleMessageChangeFeedPublishFailureHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getByMessageContentByIdMock.mockResolvedValue(aMessageContent);
  });

  test("should write an avro message on kafka client", async () => {
    const res = await HandleMessageChangeFeedPublishFailureHandler(
      functionsContextMock,
      aRetriableInput,
      telemetryClientMock,
      mockMessageContentRepository,
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
    getByMessageContentByIdMock.mockRejectedValueOnce(
      new Error("cannot reach blob storage"),
    );
    await expect(
      HandleMessageChangeFeedPublishFailureHandler(
        functionsContextMock,
        aRetriableInput,
        telemetryClientMock,
        mockMessageContentRepository,
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
        mockMessageContentRepository,
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
        mockMessageContentRepository,
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
