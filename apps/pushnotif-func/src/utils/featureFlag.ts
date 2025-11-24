import { enumType } from "@pagopa/ts-commons/lib/types";
import * as t from "io-ts";

export enum FeatureFlagEnum {
  ALL = "all",
  BETA = "beta",
  CANARY = "canary",
  NONE = "none",
}

export const FeatureFlag = enumType<FeatureFlagEnum>(
  FeatureFlagEnum,
  "FeatureFlag",
);

export type FeatureFlag = t.TypeOf<typeof FeatureFlag>;

export const getIsUserEligibleForNewFeature =
  <T>(
    isUserBeta: (i: T) => boolean,
    isUserCanary: (i: T) => boolean,
    featureFlag: FeatureFlag,
  ): ((i: T) => boolean) =>
  (i): boolean => {
    switch (featureFlag) {
      case FeatureFlagEnum.ALL:
        return true;
      case FeatureFlagEnum.BETA:
        return isUserBeta(i);
      case FeatureFlagEnum.CANARY:
        return isUserCanary(i) || isUserBeta(i);
      case FeatureFlagEnum.NONE:
        return false;
      default:
        return false;
    }
  };
