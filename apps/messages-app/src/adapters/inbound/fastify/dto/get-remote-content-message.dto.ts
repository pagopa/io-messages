import { FiscalCodeSchema } from "@pagopa/hexagonal-core/domain/value-objects";
import { remoteContentMessageSchema } from "io-messages-common/domain/remote-content-message";
import { SendNotificationResponseSchema } from "io-messages-common/domain/send-notification";
import z from "zod";

import { messageContentSchema } from "../../../../application/ports/message-content.js";
import { RemoteContentMessageOutput } from "../../../../application/use-cases/get-remote-content-message.use-case.js";

const messageWithRemoteContentSchema = z.object({
  content: messageContentSchema,
  created_at: z.string(),
  fiscal_code: FiscalCodeSchema,
  id: z.string(),
  sender_service_id: z.string().min(1),
  third_party_message: z.union([
    SendNotificationResponseSchema,
    remoteContentMessageSchema,
  ]),
  time_to_live: z.number().int().min(3600).max(604800).optional(),
});

export const GetRemoteContentMessageResponseSchema =
  messageWithRemoteContentSchema;

export type GetRemoteContentMessageResponse = z.infer<
  typeof GetRemoteContentMessageResponseSchema
>;

export const toGetRemoteContentMessageResponse = (
  output: RemoteContentMessageOutput,
): GetRemoteContentMessageResponse => output;
