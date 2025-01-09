import * as E from "fp-ts/Either";

import { KindEnum as NotifyKind } from "../../generated/notifications/NotifyMessage";

import { aFiscalCode, aRetrievedMessage } from "../../__mocks__/models.mock";

import { base64EncodeObject, sendNotification } from "../notification";
import { QueueClient } from "@azure/storage-queue";
import { toHash } from "../../utils/crypto";
import { NotificationMessageKindEnum } from "../../generated/notifications/NotificationMessageKind";

import { vi, it, describe, expect, beforeEach } from "vitest";

// -----------------------------
// Mocks
// -----------------------------

const mockSendMessage = vi.fn().mockImplementation((_) => Promise.resolve());

const queueClient = {
  sendMessage: mockSendMessage,
} as unknown as QueueClient;

// -----------------------------
// Tests
// -----------------------------

describe("Notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should submit a notification to the Queue Storage", async () => {
    const notify = sendNotification(queueClient);

    const res = await notify(
      aFiscalCode,
      aRetrievedMessage.id,
      "a Title",
      "a Body",
    )();

    expect(res).toEqual(E.right(void 0));
    expect(mockSendMessage).toBeCalledWith(
      base64EncodeObject({
        installationId: toHash(aFiscalCode),
        kind: NotifyKind[NotificationMessageKindEnum.Notify],
        payload: {
          message: "a Body",
          message_id: aRetrievedMessage.id,
          title: "a Title",
        },
      }),
    );
  });

  it("should fail if the Queue Storage fails on notify", async () => {
    mockSendMessage.mockImplementation((_) =>
      Promise.reject(new Error("Generic Error")),
    );

    const notify = sendNotification(queueClient);

    const res = await notify(
      aFiscalCode,
      aRetrievedMessage.id,
      "a Title",
      "a Body",
    )();

    expect(res).toEqual(
      E.left(
        Error(
          `Error while sending notify message to the queue [Generic Error]`,
        ),
      ),
    );
  });
});
