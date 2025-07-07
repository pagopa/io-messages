import { Context } from "@azure/functions";
import {
  RetrievedUserRCConfiguration,
  UserRCConfigurationModel,
} from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { CosmosErrors } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import * as TE from "fp-ts/lib/TaskEither";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { aCosmosResourceMetadata } from "../../../__mocks__/models.mock";
import { aRetrievedRemoteContentConfiguration } from "../../../__mocks__/remote-content";
import { handleRemoteContentMessageConfigurationChange } from "../handler";

const mockLoggerError = vi.fn();
const contextMock = {
  log: {
    error: mockLoggerError,
  },
} as unknown as Context;

const mockTrackEvent = vi.fn();
const telemetryClientMock = {
  trackException: mockTrackEvent,
} as unknown as TelemetryClient;

const aRetrievedUserRCConfiguration: RetrievedUserRCConfiguration = {
  id: aRetrievedRemoteContentConfiguration.configurationId as unknown as NonEmptyString,
  userId: aRetrievedRemoteContentConfiguration.userId,
  ...aCosmosResourceMetadata,
};

const mockUpsert = vi
  .fn()
  .mockReturnValue(TE.right(aRetrievedUserRCConfiguration));

const mockUserRCConfigurationModel = {
  upsert: mockUpsert,
} as unknown as UserRCConfigurationModel;

const defaultStartTime = 0 as NonNegativeInteger;

const handlerWithMocks = handleRemoteContentMessageConfigurationChange(
  contextMock,
  mockUserRCConfigurationModel,
  telemetryClientMock,
  defaultStartTime,
);

// ----------------------
// Tests
// ----------------------

describe("CosmosRemoteContentMessageConfigurationChangeFeed", () => {
  beforeEach(() => vi.clearAllMocks());

  test("SHOULD upsert a new UserRCConfiguration GIVEN a new RemoteContentConfiguration", async () => {
    await handlerWithMocks([aRetrievedRemoteContentConfiguration]);
    expect(mockUserRCConfigurationModel.upsert).toBeCalledTimes(1);
    expect(mockLoggerError).not.toBeCalled();
    expect(mockTrackEvent).not.toBeCalled();
  });

  test("SHOULD upsert more new UserRCConfiguration GIVEN more than 1 new RemoteContentConfiguration", async () => {
    await handlerWithMocks([
      aRetrievedRemoteContentConfiguration,
      aRetrievedRemoteContentConfiguration,
    ]);
    expect(mockUserRCConfigurationModel.upsert).toBeCalledTimes(2);
    expect(mockLoggerError).not.toBeCalled();
    expect(mockTrackEvent).not.toBeCalled();
  });

  test("SHOULD skip upsert GIVEN a RemoteContentConfiguration with _ts before defaultStartTime", async () => {
    await handlerWithMocks([
      { ...aRetrievedRemoteContentConfiguration, _ts: -1 },
    ]);
    expect(mockUserRCConfigurationModel.upsert).not.toBeCalled();
    expect(mockLoggerError).not.toBeCalled();
    expect(mockTrackEvent).not.toBeCalled();
  });

  test("SHOULD throw an error GIVEN an invalid RCConfiguration", async () => {
    await expect(
      handlerWithMocks([
        {
          ...aRetrievedRemoteContentConfiguration,
          configurationId: "notanulid" as Ulid,
        },
      ]),
    ).rejects.toThrow();
    expect(mockLoggerError).toBeCalledTimes(1);
    expect(mockTrackEvent).toBeCalledTimes(1);
    expect(mockUserRCConfigurationModel.upsert).not.toBeCalled();
  });

  test("SHOULD throw an error WHEN mockUserRCConfigurationModel.upsert return an Error", async () => {
    mockUpsert.mockReturnValue(
      TE.left({ kind: "COSMOS_ERROR_RESPONSE" } as unknown as CosmosErrors),
    );
    await expect(
      handlerWithMocks([aRetrievedRemoteContentConfiguration]),
    ).rejects.toThrow();
    expect(mockLoggerError).toBeCalledTimes(1);
    expect(mockTrackEvent).toBeCalledTimes(1);
    expect(mockUserRCConfigurationModel.upsert).toBeCalledTimes(1);
  });
});
