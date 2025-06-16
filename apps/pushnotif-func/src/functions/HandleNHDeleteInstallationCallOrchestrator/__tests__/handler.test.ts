import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { IOrchestrationFunctionContext } from "durable-functions/lib/src/iorchestrationfunctioncontext";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMockDeleteInstallationActivity } from "../../../__mocks__/activities-mocks";
import { context as contextMockBase } from "../../../__mocks__/durable-functions";
import { KindEnum as DeleteKind } from "../../../generated/notifications/DeleteInstallationMessage";
import { DeleteInstallationMessage } from "../../../generated/notifications/DeleteInstallationMessage";
import {
  success as activitySuccess,
  success,
} from "../../../utils/durable/activities";
import {
  OrchestratorInvalidInputFailure,
  success as orchestratorSuccess,
} from "../../../utils/durable/orchestrators";
import { consumeGenerator } from "../../../utils/durable/utils";
import { OrchestratorCallInput, getHandler } from "../handler";

const aFiscalCodeHash =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;
const anInstallationId = aFiscalCodeHash;

const aDeleteNotificationHubMessage: DeleteInstallationMessage = {
  installationId: anInstallationId,
  kind: DeleteKind.DeleteInstallation,
};

const nhCallOrchestratorInput = OrchestratorCallInput.encode({
  message: aDeleteNotificationHubMessage,
});

const mockDeleteInstallationActivitySuccess =
  getMockDeleteInstallationActivity(success());

const mockGetInput = vi.fn().mockImplementation(() => nhCallOrchestratorInput);
const contextMockWithDf = {
  ...contextMockBase,
  df: {
    callActivityWithRetry: vi.fn().mockReturnValue(activitySuccess()),
    getInput: mockGetInput,
    setCustomStatus: vi.fn(),
  },
} as unknown as IOrchestrationFunctionContext;

describe("HandleNHDeleteInstallationCallOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should start the activities with the right inputs", async () => {
    const orchestratorHandler = getHandler({
      deleteInstallationActivity: mockDeleteInstallationActivitySuccess,
    })(contextMockWithDf);

    consumeGenerator(orchestratorHandler);

    expect(mockDeleteInstallationActivitySuccess).toBeCalledWith(
      expect.any(Object),
      expect.objectContaining({
        installationId: aDeleteNotificationHubMessage.installationId,
      }),
    );
  });

  it("should end the activity with SUCCESS", async () => {
    const orchestratorHandler = getHandler({
      deleteInstallationActivity: mockDeleteInstallationActivitySuccess,
    })(contextMockWithDf);

    const result = consumeGenerator(orchestratorHandler);

    expect(result).toEqual(orchestratorSuccess());
  });

  it("should not start activity with wrong inputs", async () => {
    const nhCallOrchestratorInput = {
      message: "aMessage",
    };

    mockGetInput.mockImplementationOnce(() => nhCallOrchestratorInput);

    const orchestratorHandler = getHandler({
      deleteInstallationActivity: mockDeleteInstallationActivitySuccess,
    })(contextMockWithDf);

    expect.assertions(2);
    try {
      consumeGenerator(orchestratorHandler);
    } catch (err) {
      expect(OrchestratorInvalidInputFailure.is(err)).toBe(true);
      expect(contextMockWithDf.df.callActivityWithRetry).not.toBeCalled();
    }
  });
});
