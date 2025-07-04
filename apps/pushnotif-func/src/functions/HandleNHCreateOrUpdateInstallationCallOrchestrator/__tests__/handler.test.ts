import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { IOrchestrationFunctionContext } from "durable-functions/lib/src/iorchestrationfunctioncontext";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { context as contextMockBase } from "../../../__mocks__/durable-functions";
import {
  CreateOrUpdateInstallationMessage,
  KindEnum as CreateOrUpdateKind,
} from "../../../generated/notifications/CreateOrUpdateInstallationMessage";
import { PlatformEnum } from "../../../generated/notifications/Platform";
import { success } from "../../../utils/durable/activities";
import {
  CallableActivity,
  OrchestratorActivityFailure,
  OrchestratorInvalidInputFailure,
  OrchestratorSuccess,
  OrchestratorUnhandledFailure,
  failureActivity,
} from "../../../utils/durable/orchestrators";
import { consumeGenerator } from "../../../utils/durable/utils";
import { ActivityInput as CreateOrUpdateActivityInput } from "../../HandleNHCreateOrUpdateInstallationCallActivity";
import {
  NhCreateOrUpdateInstallationOrchestratorCallInput,
  getHandler,
} from "../handler";

const aFiscalCodeHash =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;
const aPushChannel =
  "fLKP3EATnBI:APA91bEy4go681jeSEpLkNqhtIrdPnEKu6Dfi-STtUiEnQn8RwMfBiPGYaqdWrmzJyXIh5Yms4017MYRS9O1LGPZwA4sOLCNIoKl4Fwg7cSeOkliAAtlQ0rVg71Kr5QmQiLlDJyxcq3p";

const aCreateOrUpdateInstallationMessage = pipe(
  {
    installationId: aFiscalCodeHash,
    kind: CreateOrUpdateKind.CreateOrUpdateInstallation,
    platform: PlatformEnum.apns,
    pushChannel: aPushChannel,
    tags: [aFiscalCodeHash],
  },
  CreateOrUpdateInstallationMessage.decode,
  E.getOrElseW((err) => {
    throw new Error(
      `Cannot decode aCreateOrUpdateInstallationMessage: ${readableReport(err)}`,
    );
  }),
);

const anOrchestratorInput =
  NhCreateOrUpdateInstallationOrchestratorCallInput.encode({
    message: aCreateOrUpdateInstallationMessage,
  });

type CallableCreateOrUpdateActivity =
  CallableActivity<CreateOrUpdateActivityInput>;

/* eslint-disable require-yield */
const mockCreateOrUpdateActivity = vi.fn<
  (
    ...args: Parameters<CallableCreateOrUpdateActivity>
  ) => ReturnType<CallableCreateOrUpdateActivity>
>(function* () {
  return { kind: "SUCCESS" };
});
/* eslint-enable require-yield */

const mockGetInput = vi.fn().mockImplementation(() => anOrchestratorInput);
const contextMockWithDf = {
  ...contextMockBase,
  df: {
    callActivityWithRetry: vi.fn().mockReturnValueOnce(success()),
    getInput: mockGetInput,
    setCustomStatus: vi.fn(),
  },
} as unknown as IOrchestrationFunctionContext;

describe("HandleNHCreateOrUpdateInstallationCallOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should start the activities with the right inputs", async () => {
    const orchestratorHandler = getHandler({
      createOrUpdateActivity: mockCreateOrUpdateActivity,
    })(contextMockWithDf);

    const result = consumeGenerator(orchestratorHandler);

    expect.assertions(1);

    pipe(
      result,
      OrchestratorSuccess.decode,
      E.fold(
        (err) => {
          throw new Error(
            `Cannot decode test result, err: ${readableReport(err)}`,
          );
        },
        () => {
          expect(mockCreateOrUpdateActivity).toBeCalledWith(
            expect.any(Object),
            expect.objectContaining({
              installationId: aCreateOrUpdateInstallationMessage.installationId,
              platform: aCreateOrUpdateInstallationMessage.platform,
              pushChannel: aCreateOrUpdateInstallationMessage.pushChannel,
              tags: aCreateOrUpdateInstallationMessage.tags,
            }),
          );
        },
      ),
    );
  });

  it("should always call CreateOrUpdate activity with new NH parameters", async () => {
    const orchestratorHandler = getHandler({
      createOrUpdateActivity: mockCreateOrUpdateActivity,
    })(contextMockWithDf);

    const result = consumeGenerator(orchestratorHandler);

    expect.assertions(1);

    pipe(
      result,
      OrchestratorSuccess.decode,
      E.fold(
        (err) => {
          throw new Error(
            `Cannot decode test result, err: ${readableReport(err)}`,
          );
        },
        () => {
          expect(mockCreateOrUpdateActivity).toBeCalledWith(
            expect.any(Object),
            expect.objectContaining({
              installationId: aCreateOrUpdateInstallationMessage.installationId,
              platform: aCreateOrUpdateInstallationMessage.platform,
              pushChannel: aCreateOrUpdateInstallationMessage.pushChannel,
              tags: aCreateOrUpdateInstallationMessage.tags,
            }),
          );
        },
      ),
    );
  });

  // -------
  // Failure
  // -------

  it("should not start activity with wrong inputs", async () => {
    const input = {
      message: "aMessage",
    };
    mockGetInput.mockImplementationOnce(() => input);

    try {
      const orchestratorHandler = getHandler({
        createOrUpdateActivity: mockCreateOrUpdateActivity,
      })(contextMockWithDf);

      expect.assertions(2);
      consumeGenerator(orchestratorHandler);
    } catch (err) {
      expect(OrchestratorInvalidInputFailure.is(err)).toBe(true);
      expect(contextMockWithDf.df.callActivityWithRetry).not.toBeCalled();
    }
  });

  it("should fail if CreateOrUpdateActivity fails with unexpected throw", async () => {
    mockCreateOrUpdateActivity.mockImplementationOnce(() => {
      throw new Error("any exception");
    });

    const orchestratorHandler = getHandler({
      createOrUpdateActivity: mockCreateOrUpdateActivity,
    })(contextMockWithDf);

    expect.assertions(2);
    try {
      consumeGenerator(orchestratorHandler);
    } catch (err) {
      expect(OrchestratorUnhandledFailure.is(err)).toBe(true);
      expect(contextMockWithDf.df.callActivityWithRetry).not.toBeCalled();
    }
  });

  it("should fail if CreateOrUpdateActivity fails", async () => {
    mockCreateOrUpdateActivity.mockImplementationOnce(() => {
      throw failureActivity("any activity name", "any reason");
    });

    const orchestratorHandler = getHandler({
      createOrUpdateActivity: mockCreateOrUpdateActivity,
    })(contextMockWithDf);

    expect.assertions(2);
    try {
      consumeGenerator(orchestratorHandler);
    } catch (err) {
      expect(OrchestratorActivityFailure.is(err)).toBe(true);
      expect(contextMockWithDf.df.callActivityWithRetry).not.toBeCalled();
    }
  });
});
