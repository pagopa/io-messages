import { FiscalCodeSchema } from "@pagopa/hexagonal-core/domain/value-objects";
import { z } from "zod";

import { assertionRefSchema } from "./assertion-ref.js";
import { assertionTypeSchema } from "./assertion-type.js";
import { lollipopRequestHeadersSchema } from "./request-headers.js";

export const lollipopHeadersSchema: z.ZodObject<
  {
    "x-pagopa-lollipop-assertion-ref": typeof assertionRefSchema;
    "x-pagopa-lollipop-assertion-type": typeof assertionTypeSchema;
    "x-pagopa-lollipop-auth-jwt": z.ZodString;
    "x-pagopa-lollipop-public-key": z.ZodString;
    "x-pagopa-lollipop-user-id": typeof FiscalCodeSchema;
  } & typeof lollipopRequestHeadersSchema.shape
> = lollipopRequestHeadersSchema.extend({
  "x-pagopa-lollipop-assertion-ref": assertionRefSchema,
  "x-pagopa-lollipop-assertion-type": assertionTypeSchema,
  "x-pagopa-lollipop-auth-jwt": z.string(),
  "x-pagopa-lollipop-public-key": z.string(),
  "x-pagopa-lollipop-user-id": FiscalCodeSchema,
});

export type LollipopHeaders = z.TypeOf<typeof lollipopHeadersSchema>;
