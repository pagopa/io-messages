import {
  Message,
  MessageContent,
  MessageMetadata,
} from "../entities/message.js";
import * as z from "zod";
import { ContentNotFoundError } from "./errors.js";

export type GetMessageByMetadataReturnType =
  | Message
  | z.ZodError
  | ContentNotFoundError;

export type GetMessageContentByIdReturnType =
  | MessageContent
  | z.ZodError
  | ContentNotFoundError;

export interface MessageContentRepository {
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
  getMessageByMetadata: (
    metadata: MessageMetadata,
  ) => Promise<GetMessageByMetadataReturnType>;
}
