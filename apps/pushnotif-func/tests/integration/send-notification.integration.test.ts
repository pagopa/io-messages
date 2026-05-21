import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { isRight } from "fp-ts/Either";
import { describe, expect, test } from "vitest";

import { sendNotification } from "../../src/services/notification";
import {
  createQueueClient,
  createQueueName,
  decodeQueueMessage,
} from "../support/azurite";

describe("sendNotification integration", () => {
  test("writes a Notify message into Azurite", async () => {
    const queueClient = createQueueClient(createQueueName("notify"));

    await queueClient.createIfNotExists();
    await queueClient.clearMessages();

    const send = sendNotification(queueClient);
    const result = await send(
      "AAABBB01C02D345D" as FiscalCode,
      "01J4QX8G17YY5QF8S9S5H7J4RN" as NonEmptyString,
      "A push title",
      "A push body",
    )();

    expect(isRight(result)).toBe(true);

    const { receivedMessageItems } = await queueClient.receiveMessages();

    expect(receivedMessageItems).toHaveLength(1);
    expect(decodeQueueMessage(receivedMessageItems[0].messageText)).toEqual({
      installationId: expect.stringMatching(/^[a-f0-9]{64}$/),
      kind: "Notify",
      payload: {
        message: "A push body",
        message_id: "01J4QX8G17YY5QF8S9S5H7J4RN",
        title: "A push title",
      },
    });

    await queueClient.deleteIfExists();
  });
});
