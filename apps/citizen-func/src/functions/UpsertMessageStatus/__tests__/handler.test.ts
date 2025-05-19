// eslint-disable @typescript-eslint/no-explicit-any, sonarjs/no-duplicate-string, sonar/sonar-max-lines-per-function

import { MessageStatusChange } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageStatusChange";
import {
  MessageStatusModel,
  RetrievedMessageStatus,
} from "@pagopa/io-functions-commons/dist/src/models/message_status";
import { CosmosErrors } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { afterEach, describe, expect, it, vi } from "vitest";

import { context as contextMock } from "../../../__mocks__/context";
import { aFiscalCode } from "../../../__mocks__/mocks";
import {
  aMessageId,
  aRetrievedMessageStatus,
} from "../../../__mocks__/mocks.message-status";
import { UpsertMessageStatusHandler } from "../handler";

// --------------------------
// Variables
// --------------------------

const aReadingStatusChange = {
  change_type: "reading",
  is_read: true,
} as MessageStatusChange;

const anArchivingStatusChange = {
  change_type: "archiving",
  is_archived: true,
} as MessageStatusChange;

const aBulkStatusChange = {
  change_type: "bulk",
  is_archived: true,
  is_read: true,
} as MessageStatusChange;

// --------------------------
// Mocks
// --------------------------

const mockFindLastVersionByModelId = vi.fn(() =>
  TE.of<CosmosErrors, O.Option<RetrievedMessageStatus>>(
    O.some(aRetrievedMessageStatus),
  ),
);
const mockUpsert = vi.fn((status) =>
  TE.of<CosmosErrors, O.Option<RetrievedMessageStatus>>({
    ...aRetrievedMessageStatus,
    ...status,
    kind: "IRetrievedMessageStatus",
    version: aRetrievedMessageStatus.version + 1,
  }),
);

const mockMessageStatusModel = {
  findLastVersionByModelId: mockFindLastVersionByModelId,
  upsert: mockUpsert,
} as unknown as MessageStatusModel;

describe("UpsertMessageStatus", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should respond with a new version of message-status when change_type is `reading`", async () => {
    const upsertMessageStatusHandler = UpsertMessageStatusHandler(
      mockMessageStatusModel,
    );

    const result = await upsertMessageStatusHandler(
      contextMock,
      aFiscalCode,
      aMessageId,
      aReadingStatusChange,
    );

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          fiscalCode: aFiscalCode,
          isArchived: false,
          isRead: true,
        }),
      );
      expect(result.value).toMatchObject({
        is_archived: false,
        is_read: true,
        version: aRetrievedMessageStatus.version + 1,
      });
    }
  });

  it("should respond with a new version of message-status when change_type is `archiving`", async () => {
    const upsertMessageStatusHandler = UpsertMessageStatusHandler(
      mockMessageStatusModel,
    );

    const result = await upsertMessageStatusHandler(
      contextMock,
      aFiscalCode,
      aMessageId,
      anArchivingStatusChange,
    );

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          fiscalCode: aFiscalCode,
          isArchived: true,
          isRead: false,
        }),
      );
      expect(result.value).toMatchObject({
        is_archived: true,
        is_read: false,
        version: aRetrievedMessageStatus.version + 1,
      });
    }
  });

  it("should respond with a new version of message-status when change_type is `bulk`", async () => {
    const upsertMessageStatusHandler = UpsertMessageStatusHandler(
      mockMessageStatusModel,
    );

    const result = await upsertMessageStatusHandler(
      contextMock,
      aFiscalCode,
      aMessageId,
      aBulkStatusChange,
    );

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          fiscalCode: aFiscalCode,
          isArchived: true,
          isRead: true,
        }),
      );
      expect(result.value).toMatchObject({
        is_archived: true,
        is_read: true,
        version: aRetrievedMessageStatus.version + 1,
      });
    }
  });
});

describe("UpsertMessageStatus - Errors", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should respond with IResponseErrorNotFound if no message status was found for messageId", async () => {
    mockFindLastVersionByModelId.mockImplementationOnce(() => TE.of(O.none));

    const upsertMessageStatusHandler = UpsertMessageStatusHandler(
      mockMessageStatusModel,
    );

    const result = await upsertMessageStatusHandler(
      contextMock,
      aFiscalCode,
      aMessageId,
      aReadingStatusChange,
    );

    expect(mockUpsert).not.toHaveBeenCalled();

    expect(result.kind).toBe("IResponseErrorNotFound");
  });

  it("should respond with IResponseErrorForbiddenNotAuthorized if fiscalCode is different from statusModel one", async () => {
    const upsertMessageStatusHandler = UpsertMessageStatusHandler(
      mockMessageStatusModel,
    );

    const result = await upsertMessageStatusHandler(
      contextMock,
      "anotherFiscalCode" as FiscalCode,
      aMessageId,
      aReadingStatusChange,
    );

    expect(mockUpsert).not.toHaveBeenCalled();

    expect(result.kind).toBe("IResponseErrorForbiddenNotAuthorized");
  });
});
