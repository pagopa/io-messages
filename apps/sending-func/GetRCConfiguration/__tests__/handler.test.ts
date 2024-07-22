import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as redis_storage from "../../utils/redis_storage";

import {
  aManageSubscriptionId,
  aRemoteContentConfiguration,
  aRetrievedRCConfiguration,
  aSubscriptionId,
  findByConfigurationIdMock,
  rccModelMock,
  someUserGroups,
  someUserGroupsWithTheAllowedOne
} from "../../__mocks__/remote-content";

import {
  getRCConfigurationHandler,
  handleEmptyErrorResponse,
  RC_CONFIGURATION_REDIS_PREFIX
} from "../handler";
import { IConfig } from "../../utils/config";
import { redisClientMock } from "../../__mocks__/redis.mock";

const aUserId = "aUserId" as NonEmptyString;
const aConfig = { INTERNAL_USER_ID: "internalUserId" } as IConfig;

const getTaskMock = jest.fn();
jest.spyOn(redis_storage, "getTask").mockImplementation(getTaskMock);

const setWithExpirationTaskMock = jest.fn();
jest
  .spyOn(redis_storage, "setWithExpirationTask")
  .mockImplementation(setWithExpirationTaskMock);

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("handleEmptyErrorResponse ", () => {
  test("should return a left with detail if the Option is none", async () => {
    const r = await handleEmptyErrorResponse("aValidUlid" as Ulid)(O.none)();

    expect(E.isLeft(r)).toBe(true);
    if (E.isLeft(r))
      expect(r.left.detail).toBe(
        "Configuration not found: Cannot find any configuration with configurationId: aValidUlid"
      );
  });
});

describe("getRCConfigurationHandler", () => {
  test("should return an IResponseSuccessJson calling the model if redis does not return a valid configuration and the userId match", async () => {
    getTaskMock.mockReturnValueOnce(TE.right(O.none));
    findByConfigurationIdMock.mockReturnValueOnce(
      TE.right(O.some(aRemoteContentConfiguration))
    );
    setWithExpirationTaskMock.mockReturnValueOnce(TE.right(true));
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig,
      redisClient: redisClientMock
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aRemoteContentConfiguration.userId
    });
    expect(r.kind).toBe("IResponseSuccessJson");
    expect(getTaskMock).toHaveBeenCalled();
    expect(findByConfigurationIdMock).toHaveBeenCalled();
    expect(setWithExpirationTaskMock).toHaveBeenCalledWith(
      redisClientMock,
      `${RC_CONFIGURATION_REDIS_PREFIX}-${aRemoteContentConfiguration.configurationId}`,
      JSON.stringify(aRemoteContentConfiguration),
      aConfig.RC_CONFIGURATION_CACHE_TTL
    );
  });

  test("should return an IResponseSuccessJson without calling the model if redis return a valid configuration and the userId match", async () => {
    getTaskMock.mockReturnValueOnce(
      TE.right(O.some(JSON.stringify(aRetrievedRCConfiguration)))
    );
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig,
      redisClient: redisClientMock
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aRemoteContentConfiguration.userId
    });
    expect(r.kind).toBe("IResponseSuccessJson");
    expect(getTaskMock).toHaveBeenCalled();
    expect(findByConfigurationIdMock).not.toHaveBeenCalled();
    expect(setWithExpirationTaskMock).not.toHaveBeenCalled();
  });

  test("should return an IResponseSuccessJson if the model return a valid configuration and the user-id is internal", async () => {
    getTaskMock.mockReturnValueOnce(TE.right(O.none));
    findByConfigurationIdMock.mockReturnValueOnce(
      TE.right(O.some(aRemoteContentConfiguration))
    );
    setWithExpirationTaskMock.mockReturnValueOnce(TE.right(true));
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig,
      redisClient: redisClientMock
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aConfig.INTERNAL_USER_ID
    });
    expect(r.kind).toBe("IResponseSuccessJson");
    expect(getTaskMock).toHaveBeenCalled();
    expect(findByConfigurationIdMock).toHaveBeenCalled();
    expect(setWithExpirationTaskMock).toHaveBeenCalledWith(
      redisClientMock,
      `${RC_CONFIGURATION_REDIS_PREFIX}-${aRemoteContentConfiguration.configurationId}`,
      JSON.stringify(aRemoteContentConfiguration),
      aConfig.RC_CONFIGURATION_CACHE_TTL
    );
  });

  test("should return an IResponseErrorForbiddenNotAuthorized if the model return a valid configuration but the userId is not internal or does not match", async () => {
    getTaskMock.mockReturnValueOnce(TE.right(O.none));
    findByConfigurationIdMock.mockReturnValueOnce(
      TE.right(O.some(aRemoteContentConfiguration))
    );
    setWithExpirationTaskMock.mockReturnValueOnce(TE.right(true));
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig,
      redisClient: redisClientMock
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: "invalid" as NonEmptyString
    });
    expect(r.kind).toBe("IResponseErrorForbiddenNotAuthorized");
    expect(getTaskMock).toHaveBeenCalled();
    expect(findByConfigurationIdMock).toHaveBeenCalled();
    expect(setWithExpirationTaskMock).toHaveBeenCalledWith(
      redisClientMock,
      `${RC_CONFIGURATION_REDIS_PREFIX}-${aRemoteContentConfiguration.configurationId}`,
      JSON.stringify(aRemoteContentConfiguration),
      aConfig.RC_CONFIGURATION_CACHE_TTL
    );
  });

  test("should return an IResponseErrorNotFound if the model return an empty Option", async () => {
    getTaskMock.mockReturnValueOnce(TE.right(O.none));
    findByConfigurationIdMock.mockReturnValueOnce(TE.right(O.none));
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig,
      redisClient: redisClientMock
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aUserId
    });
    expect(r.kind).toBe("IResponseErrorNotFound");
    expect(r.detail).toBe(
      "Configuration not found: Cannot find any configuration with configurationId: 01HNG1XBMT8V6HWGF5T053K9RJ"
    );
    expect(getTaskMock).toHaveBeenCalled();
    expect(findByConfigurationIdMock).toHaveBeenCalled();
    expect(setWithExpirationTaskMock).not.toHaveBeenCalled();
  });

  test("should return an IResponseErrorInternal if cosmos return an error", async () => {
    getTaskMock.mockReturnValueOnce(TE.right(O.none));
    findByConfigurationIdMock.mockReturnValueOnce(TE.left(O.none));
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig,
      redisClient: redisClientMock
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aUserId
    });
    expect(r.kind).toBe("IResponseErrorInternal");
    expect(r.detail).toContain(
      "Internal server error: Something went wrong trying to retrieve the configuration"
    );
    expect(getTaskMock).toHaveBeenCalled();
    expect(findByConfigurationIdMock).toHaveBeenCalled();
    expect(setWithExpirationTaskMock).not.toHaveBeenCalled();
  });

  test("should return an IResponseErrorForbiddenNotAuthorized if subscription is not manage", async () => {
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig,
      redisClient: redisClientMock
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      subscriptionId: aSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aUserId
    });
    expect(r.kind).toBe("IResponseErrorForbiddenNotAuthorized");
    expect(getTaskMock).not.toHaveBeenCalled();
    expect(findByConfigurationIdMock).not.toHaveBeenCalled();
    expect(setWithExpirationTaskMock).not.toHaveBeenCalled();
  });

  test("should return an IResponseErrorForbiddenNotAuthorized if group is not allowed", async () => {
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig,
      redisClient: redisClientMock
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroups,
      userId: aUserId
    });
    expect(r.kind).toBe("IResponseErrorForbiddenNotAuthorized");
    expect(getTaskMock).not.toHaveBeenCalled();
    expect(findByConfigurationIdMock).not.toHaveBeenCalled();
    expect(setWithExpirationTaskMock).not.toHaveBeenCalled();
  });

  test("should return an IResponseSuccessJson if subscription is not manage but the user-id is internal", async () => {
    getTaskMock.mockReturnValueOnce(TE.right(O.none));
    findByConfigurationIdMock.mockReturnValue(
      TE.right(O.some(aRemoteContentConfiguration))
    );
    setWithExpirationTaskMock.mockReturnValueOnce(TE.right(true));
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig,
      redisClient: redisClientMock
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      subscriptionId: aSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aConfig.INTERNAL_USER_ID
    });
    expect(r.kind).toBe("IResponseSuccessJson");
    expect(getTaskMock).toHaveBeenCalled();
    expect(findByConfigurationIdMock).toHaveBeenCalled();
    expect(setWithExpirationTaskMock).toHaveBeenCalledWith(
      redisClientMock,
      `${RC_CONFIGURATION_REDIS_PREFIX}-${aRemoteContentConfiguration.configurationId}`,
      JSON.stringify(aRemoteContentConfiguration),
      aConfig.RC_CONFIGURATION_CACHE_TTL
    );
  });

  test("should return an IResponseSuccessJson if group is not allowed but the user-id is internal", async () => {
    getTaskMock.mockReturnValueOnce(TE.right(O.none));
    findByConfigurationIdMock.mockReturnValue(
      TE.right(O.some(aRemoteContentConfiguration))
    );
    setWithExpirationTaskMock.mockReturnValueOnce(TE.right(true));
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig,
      redisClient: redisClientMock
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroups,
      userId: aConfig.INTERNAL_USER_ID
    });
    expect(r.kind).toBe("IResponseSuccessJson");
    expect(getTaskMock).toHaveBeenCalled();
    expect(findByConfigurationIdMock).toHaveBeenCalled();
    expect(setWithExpirationTaskMock).toHaveBeenCalledWith(
      redisClientMock,
      `${RC_CONFIGURATION_REDIS_PREFIX}-${aRemoteContentConfiguration.configurationId}`,
      JSON.stringify(aRemoteContentConfiguration),
      aConfig.RC_CONFIGURATION_CACHE_TTL
    );
  });
});
