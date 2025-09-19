import { z } from "zod";

import { lollipopContentDigestSchema } from "./content-digest.js";
import { lollipopMethodSchema } from "./lollipop-method.js";
import { lollipopOriginalURLSchema } from "./lollipop-original-url.js";
import { lollipopSignatureSchema } from "./signature.js";
import { lollipopSignatureInputSchema } from "./signature-input.js";

export const lollipopRequestHeadersSchema = z.object({
  "content-digest": lollipopContentDigestSchema.optional(),
  signature: lollipopSignatureSchema,
  "signature-input": lollipopSignatureInputSchema,
  "x-pagopa-lollipop-original-method": lollipopMethodSchema,
  "x-pagopa-lollipop-original-url": lollipopOriginalURLSchema,
});

export type LollipopRequiredHeaders = z.infer<
  typeof lollipopRequestHeadersSchema
>;
