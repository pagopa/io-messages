/* eslint-disable @typescript-eslint/no-explicit-any */
import { InvocationContext } from "@azure/functions";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as df from "durable-functions";
import { describe, expect, it, vi } from "vitest";

import { CreateOrUpdateInstallationMessage } from "../../../generated/notifications/CreateOrUpdateInstallationMessage";
import { DeleteInstallationMessage } from "../../../generated/notifications/DeleteInstallationMessage";
import { NotifyMessage } from "../../../generated/notifications/NotifyMessage";
import { PlatformEnum } from "../../../generated/notifications/Platform";
import { success } from "../../../utils/durable/activities";
import { getHandler } from "../handler";

const dfClient = {
  startNew: vi.fn().mockImplementation(() => success()),
} as any;

vi.spyOn(df, "getClient").mockReturnValue(dfClient);

const aFiscalCodeHash =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;
const aPushChannel =
  "fLKP3EATnBI:APA91bEy4go681jeSEpLkNqhtIrdPnEKu6Dfi-STtUiEnQn8RwMfBiPGYaqdWrmzJyXIh5Yms4017MYRS9O1LGPZwA4sOLCNIoKl4Fwg7cSeOkliAAtlQ0rVg71Kr5QmQiLlDJyxcq3p";

const aDeleteInStalltionMessage: DeleteInstallationMessage = {
  installationId: aFiscalCodeHash,
  kind: "DeleteInstallation" as any,
};

const aCreateOrUpdateInstallationMessage: CreateOrUpdateInstallationMessage = {
  installationId: aFiscalCodeHash,
  kind: "CreateOrUpdateInstallation" as any,
  platform: PlatformEnum.apns,
  pushChannel: aPushChannel,
  tags: [aFiscalCodeHash],
};

const aNotifyMessage: NotifyMessage = {
  installationId: aFiscalCodeHash,
  kind: "Notify" as any,
  payload: {
    message: "message",
    message_id: "id",
    title: "title",
  },
};

const mockNotifyQueueOutput = {} as any;

const mockContext = {
  error: vi.fn(),
  extraInputs: { get: vi.fn() },
  extraOutputs: { set: vi.fn() },
  log: vi.fn(),
} as unknown as InvocationContext;

describe("HandleNHNotificationCall", () => {
  it("should call Delete Orchestrator when message is DeleteInstallation", async () => {
    await getHandler(mockNotifyQueueOutput)(
      aDeleteInStalltionMessage,
      mockContext,
    );

    expect(dfClient.startNew).toHaveBeenCalledWith(
      "HandleNHDeleteInstallationCallOrchestrator",
      {
        input: {
          message: aDeleteInStalltionMessage,
        },
      },
    );
  });

  it("should call CreateOrUpdate Orchestrator when message is CreateorUpdateInstallation", async () => {
    await getHandler(mockNotifyQueueOutput)(
      aCreateOrUpdateInstallationMessage,
      mockContext,
    );

    expect(dfClient.startNew).toHaveBeenCalledWith(
      "HandleNHCreateOrUpdateInstallationCallOrchestrator",
      {
        input: {
          message: aCreateOrUpdateInstallationMessage,
        },
      },
    );
  });

  it("should not call any Orchestrator when message kind is not correct", async () => {
    const aWrongMessage = {
      installationId: aFiscalCodeHash,
      kind: "WrongMessage" as any,
    };

    expect.assertions(1);
    try {
      await getHandler(mockNotifyQueueOutput)(aWrongMessage, mockContext);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});
