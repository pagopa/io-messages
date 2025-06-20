/* eslint-disable vitest/prefer-called-with */
import {
  AccessReadMessageStatusEnum,
  ServicePreference,
} from "@pagopa/io-functions-commons/dist/src/models/service_preference";
import { Semver } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  aFiscalCode,
  aRetrievedProfile,
  aServiceId,
  autoProfileServicePreferencesSettings,
} from "../../../../__mocks__/mocks";
import * as up from "../userPreferencesCheckerFactory";

const MIN_READ_STATUS_PREFERENCES_VERSION = "1.15.3" as Semver;
const PREV_APP_VERIONS = "1.13.8" as Semver;
const NEWER_APP_VERSION = "12.1.1" as Semver;

const aServicePreferenceWithUNKNOWN: ServicePreference = {
  accessReadMessageStatus: AccessReadMessageStatusEnum.UNKNOWN,
  fiscalCode: aFiscalCode,
  isEmailEnabled: true,
  isInboxEnabled: true,
  isWebhookEnabled: true,
  serviceId: aServiceId,
} as ServicePreference;

const aServicePreferenceWithALLOW = {
  ...aServicePreferenceWithUNKNOWN,
  accessReadMessageStatus: AccessReadMessageStatusEnum.ALLOW,
};

const aServicePreferenceWithDENY = {
  ...aServicePreferenceWithUNKNOWN,
  accessReadMessageStatus: AccessReadMessageStatusEnum.DENY,
};

const mockServicePreferencesGetter = vi.fn((() =>
  TE.of(O.none)) as up.ServicePreferencesGetter);

describe("userPreferencesCheckerFactory |> userPreferenceCheckerVersionWithReadAuth", () => {
  it("should return an Error if servicePreferencesGetter returns an Error", async () => {
    mockServicePreferencesGetter.mockReturnValueOnce(
      TE.left(Error("an Error")),
    );

    const res = await up
      .userPreferenceCheckerVersionWithReadAuth(mockServicePreferencesGetter)
      .canAccessMessageReadStatus(aServiceId, aFiscalCode)();

    expect(res).toStrictEqual(E.left(Error("an Error")));
  });

  it.each`
    title                                                                                              | I_servicePreference                      | O_expectedResult
    ${"should return true if service preference does not exist"}                                       | ${O.none}                                | ${true}
    ${"should return true if service preference exists and accessReadMessageStatus is set to ALLOW"}   | ${O.some(aServicePreferenceWithALLOW)}   | ${true}
    ${"should return true if service preference exists and accessReadMessageStatus is set to UNKNOWN"} | ${O.some(aServicePreferenceWithUNKNOWN)} | ${true}
    ${"should return false if service preference exists and accessReadMessageStatus is set to DENY"}   | ${O.some(aServicePreferenceWithDENY)}    | ${false}
  `("$title", async ({ I_servicePreference, O_expectedResult }) => {
    mockServicePreferencesGetter.mockReturnValueOnce(
      TE.of(I_servicePreference),
    );

    const res = await up
      .userPreferenceCheckerVersionWithReadAuth(mockServicePreferencesGetter)
      .canAccessMessageReadStatus(aServiceId, aFiscalCode)();

    expect(res).toStrictEqual(E.right(O_expectedResult));
  });
});

describe("userPreferencesCheckerFactory |> userPreferenceCheckerVersionUNKNOWNToVersionWithReadAuth", () => {
  it.each`
    title                                                                                               | I_servicePreference                      | O_expectedResult
    ${"should return false if service preference does not exist"}                                       | ${O.none}                                | ${false}
    ${"should return false if service preference exists and accessReadMessageStatus is set to ALLOW"}   | ${O.some(aServicePreferenceWithALLOW)}   | ${false}
    ${"should return false if service preference exists and accessReadMessageStatus is set to UNKNOWN"} | ${O.some(aServicePreferenceWithUNKNOWN)} | ${false}
    ${"should return false if service preference exists and accessReadMessageStatus is set to DENY"}    | ${O.some(aServicePreferenceWithDENY)}    | ${false}
  `("$title", async ({ I_servicePreference, O_expectedResult }) => {
    mockServicePreferencesGetter.mockReturnValueOnce(
      TE.of(I_servicePreference),
    );

    const res =
      await up.userPreferenceCheckerVersionUNKNOWNToVersionWithReadAuth.canAccessMessageReadStatus(
        aServiceId,
        aFiscalCode,
      )();

    expect(res).toStrictEqual(E.right(O_expectedResult));
  });
});

describe("userPreferencesCheckerFactory |> userPreferencesCheckerFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // userPreferenceCheckerVersionUNKNOWNToVersionWithReadAuth,
  //   userPreferenceCheckerVersionWithReadAuth,
  const spyUnknownImplementation = vi.spyOn(
    up.userPreferenceCheckerVersionUNKNOWNToVersionWithReadAuth,
    "canAccessMessageReadStatus",
  );

  it("should call userPreferenceCheckerVersionUNKNOWNToVersionWithReadAuth if appVersion is UNKNOWN", async () => {
    mockServicePreferencesGetter.mockReturnValueOnce(TE.of(O.none));

    const res = await up
      .userPreferencesCheckerFactory(
        {
          ...aRetrievedProfile,
          lastAppVersion: "UNKNOWN",
        },
        mockServicePreferencesGetter,
        MIN_READ_STATUS_PREFERENCES_VERSION,
      )
      .canAccessMessageReadStatus(aServiceId, aFiscalCode)();

    expect(spyUnknownImplementation).toHaveBeenCalled();

    expect(res).toStrictEqual(E.right(false));
  });

  it("should call userPreferenceCheckerVersionUNKNOWNToVersionWithReadAuth if profile servicePreferencesSettings is of type LEGACY (version is -1)", async () => {
    mockServicePreferencesGetter.mockReturnValueOnce(TE.of(O.none));

    const res = await up
      .userPreferencesCheckerFactory(
        {
          ...aRetrievedProfile,
          lastAppVersion: MIN_READ_STATUS_PREFERENCES_VERSION,
        },
        mockServicePreferencesGetter,
        MIN_READ_STATUS_PREFERENCES_VERSION,
      )
      .canAccessMessageReadStatus(aServiceId, aFiscalCode)();

    expect(spyUnknownImplementation).toHaveBeenCalled();

    expect(res).toStrictEqual(E.right(false));
  });

  it("should call userPreferenceCheckerVersionUNKNOWNToVersionWithReadAuth if appVersion is < MIN_READ_STATUS_PREFERENCES_VERSION", async () => {
    mockServicePreferencesGetter.mockReturnValueOnce(TE.of(O.none));

    const res = await up
      .userPreferencesCheckerFactory(
        {
          ...aRetrievedProfile,
          lastAppVersion: PREV_APP_VERIONS,
        },
        mockServicePreferencesGetter,
        MIN_READ_STATUS_PREFERENCES_VERSION,
      )
      .canAccessMessageReadStatus(aServiceId, aFiscalCode)();

    expect(spyUnknownImplementation).toHaveBeenCalled();

    expect(res).toStrictEqual(E.right(false));
  });

  it("should call userPreferenceCheckerVersionWithReadAuth if appVersion is = MIN_READ_STATUS_PREFERENCES_VERSION", async () => {
    mockServicePreferencesGetter.mockReturnValueOnce(TE.of(O.none));

    const res = await up
      .userPreferencesCheckerFactory(
        {
          ...aRetrievedProfile,
          lastAppVersion: MIN_READ_STATUS_PREFERENCES_VERSION,
          servicePreferencesSettings: autoProfileServicePreferencesSettings,
        },
        mockServicePreferencesGetter,
        MIN_READ_STATUS_PREFERENCES_VERSION,
      )
      .canAccessMessageReadStatus(aServiceId, aFiscalCode)();

    expect(spyUnknownImplementation).not.toHaveBeenCalled();

    expect(res).toStrictEqual(E.right(true));
  });

  it("should call userPreferenceCheckerVersionWithReadAuth if appVersion is > MIN_READ_STATUS_PREFERENCES_VERSION", async () => {
    mockServicePreferencesGetter.mockReturnValueOnce(TE.of(O.none));

    const res = await up
      .userPreferencesCheckerFactory(
        {
          ...aRetrievedProfile,
          lastAppVersion: NEWER_APP_VERSION,
          servicePreferencesSettings: autoProfileServicePreferencesSettings,
        },
        mockServicePreferencesGetter,
        MIN_READ_STATUS_PREFERENCES_VERSION,
      )
      .canAccessMessageReadStatus(aServiceId, aFiscalCode)();

    expect(spyUnknownImplementation).not.toHaveBeenCalled();

    expect(res).toStrictEqual(E.right(true));
  });
});

describe("isAppVersionHandlingReadAuthorization", () => {
  it("should return false if currentAppVersion is lower than minAppVersionHandlingReadAuth", () => {
    const res = up.isAppVersionHandlingReadAuthorization(
      MIN_READ_STATUS_PREFERENCES_VERSION,
      PREV_APP_VERIONS,
    );

    expect(res).toStrictEqual(false);
  });

  it("should return true if currentAppVersion is equal to minAppVersionHandlingReadAuth", () => {
    const res = up.isAppVersionHandlingReadAuthorization(
      MIN_READ_STATUS_PREFERENCES_VERSION,
      MIN_READ_STATUS_PREFERENCES_VERSION,
    );

    expect(res).toStrictEqual(true);
  });

  it("should return true if currentAppVersion is greater than minAppVersionHandlingReadAuth", () => {
    const res = up.isAppVersionHandlingReadAuthorization(
      MIN_READ_STATUS_PREFERENCES_VERSION,
      NEWER_APP_VERSION,
    );

    expect(res).toStrictEqual(true);
  });

  it("should return true if a BUILD version is greater than minAppVersionHandlingReadAuth", () => {
    const buildVersion = MIN_READ_STATUS_PREFERENCES_VERSION + ".1";

    const res = up.isAppVersionHandlingReadAuthorization(
      MIN_READ_STATUS_PREFERENCES_VERSION,
      buildVersion as Semver,
    );

    expect(res).toStrictEqual(true);
  });

  it("should return false if a BUILD version is lower than minAppVersionHandlingReadAuth", () => {
    const buildVersion = PREV_APP_VERIONS + ".9";

    const res = up.isAppVersionHandlingReadAuthorization(
      MIN_READ_STATUS_PREFERENCES_VERSION,
      buildVersion as Semver,
    );

    expect(res).toStrictEqual(false);
  });
});
