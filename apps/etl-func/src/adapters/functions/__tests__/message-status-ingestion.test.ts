import { aValidMessageStatus } from "@/__mocks__/message-status.js";
import { TelemetryEventService } from "@/adapters/appinsights/appinsights.js";
import { EventErrorTableStorage } from "@/adapters/table-storage/event-error-table-storage.js";
import { IngestMessageStatusUseCase } from "@/domain/use-cases/ingest-message-status.js";
import { InvocationContext } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import messageStatusIngestionHandler from "../message-status-ingestion.js";

const publishMock = vi.fn();
const createEntity = vi.fn(() => Promise.resolve());

const mocks = vi.hoisted(() => ({
  TableClient: vi.fn().mockImplementation(() => ({
    createEntity: createEntity,
  })),
  TelemetryClient: vi.fn().mockImplementation(() => ({
    trackEvent: vi.fn(),
  })),
}));

const messageStatusesErrorTableClientMock = new mocks.TableClient();
const messageStatusErrorRepositoryMock = new EventErrorTableStorage(
  messageStatusesErrorTableClientMock,
);

const telemetryClient = new mocks.TelemetryClient();
const telemetryServiceMock = new TelemetryEventService(telemetryClient);
const telemetryTrackEventMock = vi
  .spyOn(telemetryServiceMock, "trackEvent")
  .mockResolvedValue();

const ingestUseCase = new IngestMessageStatusUseCase({ publish: publishMock });

const handler = messageStatusIngestionHandler(
  ingestUseCase,
  messageStatusErrorRepositoryMock,
  telemetryServiceMock,
);

const eventErrorRepoPushSpy = vi
  .spyOn(messageStatusErrorRepositoryMock, "push")
  .mockResolvedValue();

const context = new InvocationContext();

describe("messageStatusIngestionHandler", () => {
  afterEach(() => {
    eventErrorRepoPushSpy.mockClear();
    telemetryTrackEventMock.mockClear();
    context.retryContext = { maxRetryCount: 1, retryCount: 1 };
  });

  test("should never call the publish if the input is an empty array", async () => {
    const cosmosHandler = handler;
    await cosmosHandler([], context);
    expect(publishMock).not.toHaveBeenCalled();
    expect(eventErrorRepoPushSpy).not.toHaveBeenCalledOnce();
    expect(telemetryTrackEventMock).not.toHaveBeenCalledOnce();
  });

  test("should call the publish with just 1 element if the array conains only a valid element", async () => {
    const cosmosHandler = handler;
    await cosmosHandler([aValidMessageStatus, { bar: {}, foo: true }], context);
    expect(publishMock).toHaveBeenCalledWith([
      {
        created_at: new Date(aValidMessageStatus.updatedAt).getTime(),
        id: aValidMessageStatus.id,
        is_archived: aValidMessageStatus.isArchived,
        is_read: aValidMessageStatus.isRead,
        message_id: aValidMessageStatus.messageId,
        op: "CREATE",
        schema_version: 1,
        status: aValidMessageStatus.status,
        timestamp: new Date(aValidMessageStatus.updatedAt).getTime(),
        version: aValidMessageStatus.version,
      },
    ]);
    expect(eventErrorRepoPushSpy).toHaveBeenCalledOnce();
    expect(telemetryTrackEventMock).toHaveBeenCalledOnce();
  });
});
