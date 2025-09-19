import { fiscalCodeSchema } from "@/domain/fiscal-code.js";
import { z } from "zod";

import { assertionRefSchema } from "./assertion-ref.js";
import { assertionTypeSchema } from "./assertion-type.js";
import { lollipopRequestHeadersSchema } from "./request-headers.js";

export const lollipopHeadersSchema = lollipopRequestHeadersSchema.merge(
  z.object({
    "x-pagopa-lollipop-assertion-ref": assertionRefSchema,
    "x-pagopa-lollipop-assertion-type": assertionTypeSchema,
    "x-pagopa-lollipop-auth-jwt": z.string(),
    "x-pagopa-lollipop-public-key": z.string(),
    "x-pagopa-lollipop-user-id": fiscalCodeSchema,
  }),
);

export type LollipopHeaders = z.TypeOf<typeof lollipopHeadersSchema>;
