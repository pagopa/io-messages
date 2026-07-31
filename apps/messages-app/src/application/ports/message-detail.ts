import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";
import z from "zod";

import { MalformedEntityError } from "./error.js";

export const messageDetailSchema = z.object({
  organization_fiscal_code: z.string(),
  organization_name: z.string(),
  sender_service_id: z.string().min(1),
  service_name: z.string(),
});
export type MessageDetail = z.TypeOf<typeof messageDetailSchema>;

export interface MessageDetailRepository {
  getMessageDetailsByServiceIds(
    serviceIDs: string[],
  ): Promise<
    Result<
      Map<string, Result<MessageDetail, MalformedEntityError | NotFoundError>>,
      GenericError | TooManyRequestsError
    >
  >;
}
