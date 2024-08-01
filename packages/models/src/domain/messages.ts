import * as z from "zod";

import {
  CosmosContainer,
  CosmosDB,
  unknownToCosmosError,
} from "@/adapters/cosmos.js";
import { ItemResponse } from "@azure/cosmos";

export const messageSchema = z.object({ messageId: z.string().ulid() });
export type MessageSchema = z.TypeOf<typeof messageSchema>;

export class MessagesModel extends CosmosContainer<
  MessageSchema,
  MessageSchema
> {
  constructor(cosmosDb: CosmosDB, containerName: string) {
    super(cosmosDb, containerName, messageSchema.parseAsync);
  }

  public async insertMessage(
    message: MessageSchema,
  ): Promise<Error | ItemResponse<MessageSchema>> {
    try {
      return await this.create(message);
    } catch (error) {
      return unknownToCosmosError(error);
    }
  }

  public async selectMessage(
    messageId: string,
  ): Promise<Error | ItemResponse<MessageSchema>> {
    try {
      return await this.read(messageId);
    } catch (error) {
      return unknownToCosmosError(error);
    }
  }
}
