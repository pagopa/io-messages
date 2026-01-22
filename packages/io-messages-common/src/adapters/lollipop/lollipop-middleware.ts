import { TelemetryEventName, TelemetryService } from "@/domain/telemetry.js";
import { HttpRequest } from "@azure/functions";
import { ulid } from "ulid";
import z from "zod";

import { userIdentitySchema } from "../auth/user-identity.js";
import { Middleware, MiddlewareError } from "../middleware.js";
import {
  assertionRefSha256Schema,
  assertionRefSha384Schema,
  assertionRefSha512Schema,
} from "./definitions/assertion-ref.js";
import {
  LollipopHeaders,
  lollipopHeadersSchema,
} from "./definitions/lollipop-headers.js";
import {
  JwkPubKeyHashAlgorithm,
  jwkPubKeyHashAlgorithmSchema,
} from "./definitions/pub-key-algorithm.js";
import { lollipopRequestHeadersSchema } from "./definitions/request-headers.js";
import { LollipopSignatureInput } from "./definitions/signature-input.js";
import { Thumbprint, thumbprintSchema } from "./definitions/thumbprint.js";
import LollipopClient, { LollipopClientError } from "./lollipop-client.js";

const algoSchemaMap: {
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
  assertionRef: string,
): JwkPubKeyHashAlgorithm => {
  const found = algoSchemaMap.find(
    ({ schema }) => schema.safeParse(assertionRef).success,
  );
  if (!found)
    throw new MiddlewareError("Unknown algorithm for given AssertionRef", 403);
  return found.algo;
};

const getKeyThumbprintFromSignature = (
  signatureInput: LollipopSignatureInput,
): Thumbprint => {
  const match = /;?keyid="([^"]+)";?/.exec(signatureInput);
  const thumbprint = match?.[1];
  const parsed = thumbprintSchema.safeParse(thumbprint);
  if (!parsed.success)
    throw new MiddlewareError("Invalid keyid in signature-input", 500);
  return parsed.data;
};

const getNonceOrUuidFromSignature = (
  signatureInput: LollipopSignatureInput,
): string => {
  const match = /;?nonce="([^"]+)";?/.exec(signatureInput);
  return match ? match[1] : ulid();
};

export const parseLollipopHeaders = async (
  req: HttpRequest,
  lollipopClient: LollipopClient,
  telemetryService: TelemetryService,
): Promise<LollipopHeaders> => {
  const normalizedHeaders = Object.fromEntries(req.headers.entries());
  const parsedRequestHeaders =
    lollipopRequestHeadersSchema.safeParse(normalizedHeaders);
  if (!parsedRequestHeaders.success) {
    telemetryService.trackEvent(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      {
        body: z.treeifyError(parsedRequestHeaders.error),
        status: 403,
      },
    );
    throw new MiddlewareError(
      `Missing or invalid required lollipop headers`,
      403,
    );
  }

  const requestHeaders = parsedRequestHeaders.data;

  const userHeader = req.headers.get("x-user");
  if (!userHeader) {
    telemetryService.trackEvent(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      {
        body: "Missing x-user header",
        status: 401,
      },
    );
    throw new MiddlewareError("Missing x-user header", 401);
  }

  const decodedUser = JSON.parse(
    Buffer.from(userHeader, "base64").toString("utf-8"),
  );
  const parsedUser = userIdentitySchema.safeParse(decodedUser);
  if (!parsedUser.success) {
    telemetryService.trackEvent(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      {
        body: JSON.stringify(z.treeifyError(parsedUser.error)),
        status: 401,
      },
    );
    throw new MiddlewareError(`Invalid x-user header ${parsedUser.error}`, 401);
  }

  const userIdentity = parsedUser.data;
  const signatureInput = requestHeaders["signature-input"];

  const operationId = getNonceOrUuidFromSignature(signatureInput);
  const thumbprint = getKeyThumbprintFromSignature(signatureInput);
  const assertionRef = userIdentity.assertion_ref;

  if (!assertionRef) {
    telemetryService.trackEvent(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      {
        body: "Missing AssertionRef in user identity",
        status: 403,
      },
    );
    throw new MiddlewareError("AssertionRef is missing", 403);
  }

  const algo = getAlgoFromAssertionRef(assertionRef);
  if (assertionRef !== `${algo}-${thumbprint}`) {
    telemetryService.trackEvent(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      {
        body: "AssertionRef mismatch",
        status: 403,
      },
    );
    throw new MiddlewareError("AssertionRef mismatch", 403);
  }

  try {
    const lcParams = await lollipopClient.generateLCParams(
      assertionRef,
      operationId,
    );

    return lollipopHeadersSchema.parse({
      ["x-pagopa-lollipop-assertion-ref"]: lcParams.assertion_ref,
      ["x-pagopa-lollipop-assertion-type"]: lcParams.assertion_type,
      ["x-pagopa-lollipop-auth-jwt"]: lcParams.lc_authentication_bearer,
      ["x-pagopa-lollipop-public-key"]: lcParams.pub_key,
      ["x-pagopa-lollipop-user-id"]: userIdentity.fiscal_code,
      ...requestHeaders,
    });
  } catch (err) {
    if (err instanceof LollipopClientError) {
      telemetryService.trackEvent(
        TelemetryEventName.LOLLIPOP_MIDDLEWARE_GET_LC_PARAMS_ERROR,
        {
          body: JSON.stringify(err.body),
          status: 500,
        },
      );
      throw new MiddlewareError(err.message, 500, err.body);
    }

    telemetryService.trackEvent(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_GENERIC_SERVER_ERROR,
    );
    throw new Error(`Unexpected Middleware error | ${err}`);
  }
};

export function createLollipopMiddleware(
  lollipopClient: LollipopClient,
  telemetryService: TelemetryService,
): Middleware<LollipopHeaders> {
  return async (req: HttpRequest) =>
    await parseLollipopHeaders(req, lollipopClient, telemetryService);
}
