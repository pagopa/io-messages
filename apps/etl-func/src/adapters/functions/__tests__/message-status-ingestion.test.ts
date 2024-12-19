import { aValidMessageStatus } from "@/__mocks__/message-status.js";
import { IngestMessageStatusUseCase } from "@/domain/use-cases/ingest-message-status.js";
import { InvocationContext } from "@azure/functions";
import { describe, expect, test, vi } from "vitest";

import messageStatusIngestionHandler from "../message-status-ingestion.js";

const publishMock = vi.fn();

const ingestUseCase = new IngestMessageStatusUseCase({ publish: publishMock });
const azureContext = new InvocationContext();

describe("messageStatusIngestionHandler", () => {
  test("should never call the publish if the input is an empty array", async () => {
    const cosmosHandler = messageStatusIngestionHandler(ingestUseCase);
    await cosmosHandler([], azureContext);
    expect(publishMock).not.toHaveBeenCalled();
  });

  test("should call the publish with just 1 element if the array conains only a valid element", async () => {
    const cosmosHandler = messageStatusIngestionHandler(ingestUseCase);
    await cosmosHandler(
      [aValidMessageStatus, { bar: {}, foo: true }],
      azureContext,
    );
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
  });
});
