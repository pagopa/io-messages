import { BaseError } from "@pagopa/hexagonal-core";

/**
 * An entity retrieved using an outbound adapter was malformed.
 */
export class MalformedEntityError extends BaseError {
  override readonly kind = "MalformedEntityError" as const;
  override tag = "malformed-entity-error";

  /** @param message Detail describing the validation failure. */
  constructor(message: string) {
    super("Malformed entity error: " + message);
  }
}
