import type { UseCase } from "@pagopa/hexagonal-core";
import type { AssertionRef } from "io-messages-common/adapters/lollipop/definitions/assertion-ref";
import type { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import type { LollipopRequiredHeaders } from "io-messages-common/adapters/lollipop/definitions/request-headers";
import type { FiscalCode } from "io-messages-common/domain/fiscal-code";
import type { Result } from "neverthrow";

import { ForbiddenError, ValidationError } from "@pagopa/hexagonal-core";
import {
  assertionRefSha256Schema,
  assertionRefSha384Schema,
  assertionRefSha512Schema,
} from "io-messages-common/adapters/lollipop/definitions/assertion-ref";
import { lollipopHeadersSchema } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import {
  JwkPubKeyHashAlgorithm,
  jwkPubKeyHashAlgorithmSchema,
} from "io-messages-common/adapters/lollipop/definitions/pub-key-algorithm";
import { thumbprintSchema } from "io-messages-common/adapters/lollipop/definitions/thumbprint";
import { err, ok } from "neverthrow";
import { ulid } from "ulid";

import { MalformedEntityError } from "../ports/error.js";
import { LcParamsError, LcParamsRepository } from "../ports/lc-params.js";

export interface BuildLollipopHeadersInput {
  // Missing when the caller's session has no lollipop-signed login.
  assertionRef: AssertionRef | undefined;
  fiscalCode: FiscalCode;
  requestHeaders: LollipopRequiredHeaders;
}

export type BuildLollipopHeadersError = LcParamsError;

export type BuildLollipopHeadersUseCase = UseCase<
  BuildLollipopHeadersInput,
  LollipopHeaders,
  BuildLollipopHeadersError
>;

type OperationIdGenerator = () => string;

const algoSchemaByName: {
  algo: JwkPubKeyHashAlgorithm;
  schema:
    | typeof assertionRefSha256Schema
    | typeof assertionRefSha384Schema
    | typeof assertionRefSha512Schema;
}[] = [
  {
    algo: jwkPubKeyHashAlgorithmSchema.enum.sha256,
    schema: assertionRefSha256Schema,
  },
  {
    algo: jwkPubKeyHashAlgorithmSchema.enum.sha384,
    schema: assertionRefSha384Schema,
  },
  {
    algo: jwkPubKeyHashAlgorithmSchema.enum.sha512,
    schema: assertionRefSha512Schema,
  },
];

const getAlgoFromAssertionRef = (
  assertionRef: AssertionRef,
): Result<JwkPubKeyHashAlgorithm, ForbiddenError> => {
  const found = algoSchemaByName.find(
    ({ schema }) => schema.safeParse(assertionRef).success,
  );
  return found ? ok(found.algo) : err(new ForbiddenError());
};

const getKeyThumbprintFromSignature = (
  signatureInput: string,
): Result<string, ValidationError> => {
  const match = /;?keyid="([^"]+)";?/.exec(signatureInput);
  const parsed = thumbprintSchema.safeParse(match?.[1]);
  return parsed.success
    ? ok(parsed.data)
    : err(new ValidationError("Invalid keyid in signature-input"));
};

const getNonceOrOperationId = (
  signatureInput: string,
  generateOperationId: OperationIdGenerator,
): string => {
  const match = /;?nonce="([^"]+)";?/.exec(signatureInput);
  return match ? match[1] : generateOperationId();
};

export const makeBuildLollipopHeadersUseCase =
  (
    lcParamsRepository: LcParamsRepository,
    generateOperationId: OperationIdGenerator = ulid,
  ): BuildLollipopHeadersUseCase =>
  async ({ assertionRef, fiscalCode, requestHeaders }) => {
    if (!assertionRef) {
      return err(new ForbiddenError());
    }

    const thumbprintResult = getKeyThumbprintFromSignature(
      requestHeaders["signature-input"],
    );
    if (thumbprintResult.isErr()) {
      return err(thumbprintResult.error);
    }

    const algoResult = getAlgoFromAssertionRef(assertionRef);
    if (algoResult.isErr()) {
      return err(algoResult.error);
    }

    // The assertion ref is expected to be the algo-prefixed key thumbprint carried by signature-input.
    if (assertionRef !== `${algoResult.value}-${thumbprintResult.value}`) {
      return err(new ForbiddenError());
    }

    const operationId = getNonceOrOperationId(
      requestHeaders["signature-input"],
      generateOperationId,
    );

    const lcParamsResult = await lcParamsRepository.generateLcParams(
      assertionRef,
      operationId,
    );
    if (lcParamsResult.isErr()) {
      return err(lcParamsResult.error);
    }
    const lcParams = lcParamsResult.value;

    const parsedHeaders = lollipopHeadersSchema.safeParse({
      "x-pagopa-lollipop-assertion-ref": lcParams.assertion_ref,
      "x-pagopa-lollipop-assertion-type": lcParams.assertion_type,
      "x-pagopa-lollipop-auth-jwt": lcParams.lc_authentication_bearer,
      "x-pagopa-lollipop-public-key": lcParams.pub_key,
      "x-pagopa-lollipop-user-id": fiscalCode,
      ...requestHeaders,
    });
    if (!parsedHeaders.success) {
      return err(
        new MalformedEntityError(
          `invalid lollipop headers built from lc params: ${parsedHeaders.error.message}`,
        ),
      );
    }

    return ok(parsedHeaders.data);
  };
