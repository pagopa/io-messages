import { RestError } from "@azure/storage-blob";
import * as z from "zod";

import {
  GetMessageByMetadataReturnType,
  MessageContent,
  MessageMetadata,
} from "../entities/message.js";

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
