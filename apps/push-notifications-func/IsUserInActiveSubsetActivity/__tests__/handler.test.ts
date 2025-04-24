import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { describe, expect, it } from "vitest";

import { context as contextMock } from "../../__mocks__/durable-functions";
import {
  ActivityLogger,
  createLogger,
} from "../../utils/durable/activities/log";
import { getIsInActiveSubset } from "../../utils/featureFlags";
import { activityResultSuccessWithValue, getActivityBody } from "../handler";

const aFiscalCodeHash =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const mockLogger: ActivityLogger = createLogger(contextMock, "");

const userIsInActiveSubset: ReturnType<typeof getIsInActiveSubset> = () => true;

const userIsNotInActiveSubset: ReturnType<typeof getIsInActiveSubset> = () =>
  false;

describe("IsUserInActiveSubsetActivity - Beta Test Users", () => {
  it("should return false if userIsNotInActiveSubset return true", async () => {
    const handler = getActivityBody({
      enabledFeatureFlag: "beta",
      isInActiveSubset: userIsInActiveSubset,
    });
    const input = {
      installationId: aFiscalCodeHash,
    };
    const result = await pipe(
      {
        context: {
          ...contextMock,
          bindings: {
            betaTestUser: [],
          },
        },
        input,
        logger: mockLogger,
      },
      handler,
      TE.toUnion,
    )();

    pipe(
      result,
      activityResultSuccessWithValue.decode,
      E.fold(
        () => {
          throw new Error();
        },
        (r) => expect(r.value).toBe(true),
      ),
    );
  });

  it("should return false if userIsNotInActiveSubset return false", async () => {
    const handler = getActivityBody({
      enabledFeatureFlag: "beta",
      isInActiveSubset: userIsNotInActiveSubset,
    });
    const input = {
      installationId: aFiscalCodeHash,
    };
    const result = await pipe(
      {
        context: {
          ...contextMock,
          bindings: {
            betaTestUser: [],
          },
        },
        input,
        logger: mockLogger,
      },
      handler,
      TE.toUnion,
    )();

    pipe(
      result,
      activityResultSuccessWithValue.decode,
      E.fold(
        () => {
          throw new Error();
        },
        (r) => expect(r.value).toBe(false),
      ),
    );
  });
});
