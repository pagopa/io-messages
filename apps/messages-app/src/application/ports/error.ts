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

/** A message status version already exists and cannot be overwritten. */
export class MessageStatusVersionConflictError extends BaseError {
  override readonly kind = "MessageStatusVersionConflictError" as const;
  override tag = "message-status-version-conflict-error";

  constructor(messageId: string, version: number) {
    super(`Version ${version} already exists for message status ${messageId}`);
  }
}
