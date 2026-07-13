import {
  FiscalCode,
  GenericError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";
import z from "zod";

export const featureLevelSchema = z
  .enum(["ADVANCED", "STANDARD"])
  .default("STANDARD");
export type FeatureLevel = z.TypeOf<typeof featureLevelSchema>;

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
  featureLevelType: featureLevelSchema,
  fiscalCode: z.string(),
  id: z.ulid(),
  indexedId: z.ulid(),
  isPending: z.boolean().default(false),
  senderServiceId: z.string().min(1),
  senderUserId: z.string().min(1),
  timeToLiveSeconds: z.number(),
});
export type MessageMetadata = z.TypeOf<typeof messageMetadataSchema>;

export interface MessageMetadataRepository {
  /**
   * Returns a page of message metadata for the user identified by the provided
   * fiscal code. Content and status are retrieved separately.
   *
   * `pageSize` is an upper bound: the method returns *up to* `pageSize` items.
   * Fewer may be returned either because the user has fewer messages or because
   * invalid/malformed documents are stripped from the result (see below).
   *
   * If `maximumID` is provided it is used as an upper bound cursor to return the
   * message metadatas older than `maximumID` (next page).
   *
   * If `minimumID` is provided it is used as a lower bound to return message
   * metadatas newer than `minimumID` (previous page). Both bounds can be
   * combined to restrict the result to a window.
   *
   * In case of invalid/malformed documents this method will simply ignore them.
   */
  getMessagesMetadataByUser(
    fiscalCode: FiscalCode,
    pageSize: number,
    maximumID?: string,
    minimumID?: string,
  ): Promise<Result<MessageMetadata[], GenericError | TooManyRequestsError>>;
}
