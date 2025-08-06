import { fiscalCodeSchema } from "../../..//domain/fiscal-code.js";
import { assertionRefSchema } from "../definitions/assertion-ref.js";
import { AssertionType } from "../definitions/assertion-type.js";
import { lcParamsSchema } from "../definitions/lc-params.js";
import { problemJsonSchema } from "../definitions/problem-json.js";
import { signatureInputSchema } from "../definitions/signature-input.js";
import { thumbprintSchema } from "../definitions/thumbprint.js";

const aBearerToken = "aBearerTokenJWT";
export const aFiscalCode = fiscalCodeSchema.parse("RMLGNN97R06F158N");

export const anAssertionRef = assertionRefSchema.parse(
  "sha256-6LvipIvFuhyorHpUqK3HjySC5Y6gshXHFBhU9EJ4DoM=",
);

export const aThumbprint = thumbprintSchema.parse(
  "6LvipIvFuhyorHpUqK3HjySC5Y6gshXHFBhU9EJ4DoM=",
);
export const aSignatureInput = signatureInputSchema.parse(
  `sig1=("x-pagopa-lollipop-original-method" "x-pagopa-lollipop-original-url"); created=1618884475; keyid="${aThumbprint}"`,
);

export const anLcParams = lcParamsSchema.parse({
  assertion_file_name: `${aFiscalCode}-${anAssertionRef}`,
  assertion_type: AssertionType.Enum.OIDC,
  expired_at: new Date(),
  fiscal_code: aFiscalCode,
  lc_authentication_bearer: aBearerToken,
});

export const aProblemJson = problemJsonSchema.parse({
  detail: "aDetail",
  instance: "https://example.com",
  status: 400,
  title: "aTitle",
  type: "https://example.com",
});
