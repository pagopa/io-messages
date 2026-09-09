import { GenericError } from "@pagopa/hexagonal-core";
import { messageIDSchema } from "io-messages-common/domain/message";
import { Result } from "neverthrow";
import z from "zod";

const defaultAddressesSchema = z.object({
  email: z.email().optional(),
});

export const messageCreatedEventSchema = z.object({
  defaultAddresses: defaultAddressesSchema.optional(),
  messageId: messageIDSchema,
});
export type MessageCreatedEvent = z.TypeOf<typeof messageCreatedEventSchema>;

export interface MessageCreatedEventPublisher {
  /**
   * Publishes the event notifying that a message has been created.
   *
   * Returns a `GenericError` when the event cannot be published.
   */
  publish: (event: MessageCreatedEvent) => Promise<Result<void, GenericError>>;
}
