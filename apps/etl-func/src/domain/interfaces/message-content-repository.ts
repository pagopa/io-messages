import { RestError } from "@azure/storage-blob";
import * as z from "zod";

import {
  Message,
  MessageContent,
  MessageMetadata,
} from "../entities/message.js";

export type GetMessageByMetadataReturnType = Message | z.ZodError | RestError;

export type GetMessageContentByIdReturnType =
  | MessageContent
  | z.ZodError
  | RestError;

export interface MessageContentRepository {
  getMessageByMetadata: (
    metadata: MessageMetadata,
  ) => Promise<GetMessageByMetadataReturnType>;
  getMessageContentById: (
    messageId: string,
  ) => Promise<GetMessageContentByIdReturnType>;
}
