import { RestError } from "@azure/storage-blob";
import * as z from "zod";

import {
  Message,
  MessageContent,
  MessageMetadata,
} from "../entities/message.js";

export type GetMessageByMetadataReturnType = Message | RestError | z.ZodError;

export type GetMessageContentByIdReturnType =
  | MessageContent
  | RestError
  | z.ZodError;

export interface MessageContentRepository {
  getMessageByMetadata: (
    metadata: MessageMetadata,
  ) => Promise<GetMessageByMetadataReturnType>;
  getMessageContentById: (
    messageId: string,
  ) => Promise<GetMessageContentByIdReturnType>;
}
