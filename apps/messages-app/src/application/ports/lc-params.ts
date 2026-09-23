import type { Result } from "neverthrow";

import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { AssertionRef } from "io-messages-common/adapters/lollipop/definitions/assertion-ref";
import { LcParams } from "io-messages-common/adapters/lollipop/definitions/lc-params";

import { MalformedEntityError } from "./error.js";

export type LcParamsError =
  | ForbiddenError
  | GenericError
  | MalformedEntityError
  | NotFoundError
  | ValidationError;

export interface LcParamsRepository {
  generateLcParams(
    assertionRef: AssertionRef,
    operationId: string,
  ): Promise<Result<LcParams, LcParamsError>>;
}
