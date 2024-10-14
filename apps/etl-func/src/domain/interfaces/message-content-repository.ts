import { RestError } from "@azure/storage-blob";
import * as z from "zod";

import {
  Message,
  MessageContent,
  MessageMetadata,
} from "../entities/message.js";
import { ContentNotFoundError } from "./errors.js";

export type GetMessageByMetadataReturnType =
  | ContentNotFoundError
  | Message
  //TODO: remove this
  | z.ZodError;

export type GetMessageContentByIdReturnType =
  | MessageContent
  | RestError
  | z.ZodError;

export interface MessageContentRepository {
  getMessageByMetadata: (
    metadata: MessageMetadata,
  ) => Promise<GetMessageByMetadataReturnType>;
  /**
   * Retrieve the content of the message identified by the messageId parameter.
   *
   * @param messageId {string}
   * @throws {ContentNotFoundError} There is no content for this message.
   * @throws {SyntaxError} The content of the message is not a valid JSON.
   * @throws {z.ZodError} The content of the message does not satisfy the MessageContent shape.
   * @throws {Error} Something happened trying to retrieve the content of the message.
   * @returns {MessageContent} the content of the message.
   */
  getMessageContentById: (
    messageId: string,
  ) => Promise<GetMessageContentByIdReturnType>;
}
