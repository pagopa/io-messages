// eslint-disable @typescript-eslint/no-explicit-any, sonarjs/no-duplicate-string, sonar/sonar-max-lines-per-function
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { afterEach, describe, expect, it, vi } from "vitest";

import { context as contextMock } from "../../__mocks__/context";
import {
  aRCConfigurationWithBothEnv,
  aRetrievedRCConfigurationWithBothEnv,
} from "../../__mocks__/remote-content";
import RCConfigurationUtility from "../../utils/remoteContentConfig";
import { GetRCConfigurationHandler } from "../handler";

const getOrCacheMaybeRCConfigurationByIdMock = vi
  .fn()
  .mockReturnValue(TE.right(O.some(aRetrievedRCConfigurationWithBothEnv)));

const mockRCConfigurationUtility = {
  getOrCacheMaybeRCConfigurationById: getOrCacheMaybeRCConfigurationByIdMock,
  getOrCacheRCConfigurationWithFallback: vi.fn(), // not used for this handler
} as unknown as RCConfigurationUtility;

describe("GetRCConfigurationHandler", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it("should fail if any error occurs trying to retrieve the remote content configuration", async () => {
    getOrCacheMaybeRCConfigurationByIdMock.mockReturnValueOnce(
      TE.left(new Error("Any error")),
    );

    const getRCConfigurationHandler = GetRCConfigurationHandler(
      mockRCConfigurationUtility,
    );

    const result = await getRCConfigurationHandler(
      contextMock as any,
      aRetrievedRCConfigurationWithBothEnv.configurationId,
    );

    expect(result.kind).toBe("IResponseErrorInternal");
  });

  it("should fail with Not Found if no configuration is found with the requested id", async () => {
    getOrCacheMaybeRCConfigurationByIdMock.mockReturnValueOnce(
      TE.right(O.none),
    );

    const getRCConfigurationHandler = GetRCConfigurationHandler(
      mockRCConfigurationUtility,
    );

    const result = await getRCConfigurationHandler(
      contextMock as any,
      aRetrievedRCConfigurationWithBothEnv.configurationId,
    );

    expect(result.kind).toBe("IResponseErrorNotFound");
  });

  it("should respond with the requested remote content configuration", async () => {
    const getRCConfigurationHandler = GetRCConfigurationHandler(
      mockRCConfigurationUtility,
    );

    const result = await getRCConfigurationHandler(
      contextMock as any,
      aRetrievedRCConfigurationWithBothEnv.configurationId,
    );

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(result.value).toEqual(aRCConfigurationWithBothEnv);
    }
  });
});
