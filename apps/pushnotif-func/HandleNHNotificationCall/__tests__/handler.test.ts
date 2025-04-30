/* eslint-disable @typescript-eslint/no-explicit-any */
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as df from "durable-functions";
import { DurableOrchestrationClient } from "durable-functions/lib/src/durableorchestrationclient";
import { describe, expect, it, vi } from "vitest";

import { context } from "../../__mocks__/durable-functions";
import { CreateOrUpdateInstallationMessage } from "../../generated/notifications/CreateOrUpdateInstallationMessage";
import { DeleteInstallationMessage } from "../../generated/notifications/DeleteInstallationMessage";
import { NotifyMessage } from "../../generated/notifications/NotifyMessage";
import { PlatformEnum } from "../../generated/notifications/Platform";
import { success } from "../../utils/durable/activities";
import { NhNotifyMessageRequest } from "../../utils/types";
import { getHandler } from "../handler";

const dfClient = {
  startNew: vi.fn().mockImplementation(() => success()),
} as any as DurableOrchestrationClient;

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

const betaTestUser: readonly { readonly RowKey: string }[] = [
  { RowKey: aNotifyMessage.installationId },
];
const dummyContextWithBeta = {
  ...context,
  bindings: {
    betaTestUser: betaTestUser,
  },
};

describe("HandleNHNotificationCall", () => {
  it("should call Delete Orchestrator when message is DeleteInstallation", async () => {
    await getHandler()(dummyContextWithBeta, aDeleteInStalltionMessage);

    expect(dfClient.startNew).toHaveBeenCalledWith(
      "HandleNHDeleteInstallationCallOrchestrator",
      undefined,
      {
        message: aDeleteInStalltionMessage,
      },
    );
  });

  it("should call CreateOrUpdate Orchestrator when message is CreateorUpdateInstallation", async () => {
    await getHandler()(
      dummyContextWithBeta,
      aCreateOrUpdateInstallationMessage,
    );

    expect(dfClient.startNew).toHaveBeenCalledWith(
      "HandleNHCreateOrUpdateInstallationCallOrchestrator",
      undefined,
      {
        message: aCreateOrUpdateInstallationMessage,
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
      await getHandler()(dummyContextWithBeta, aWrongMessage);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});
