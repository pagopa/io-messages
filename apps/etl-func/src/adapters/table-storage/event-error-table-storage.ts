import { EventErrorRepository } from "@/domain/event.js";
import { TableClient } from "@azure/data-tables";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const messageErrorTableEntitySchema = z.object({
  errorType: z.string().min(1).optional(),
  event: z.string().min(1),
  partitionKey: z.string().min(1),
  rowKey: z.string().min(1),
  timestamp: z.string().min(1),
});

type messageErrorTableEntityType = z.TypeOf<
  typeof messageErrorTableEntitySchema
>;

export class EventErrorTableStorage<T> implements EventErrorRepository<T> {
  #tableClient: TableClient;

  constructor(tableClient: TableClient) {
    this.#tableClient = tableClient;
  }

  public createTableEntity(
    event: T,
    errorType?: string,
  ): messageErrorTableEntityType {
    return {
      errorType: errorType,
      event: JSON.stringify(event),
      partitionKey: new Date().getFullYear().toString(),
      rowKey: uuidv4(),
      timestamp: new Date().getTime().toString(),
    };
  }

  async push(event: T, reason?: string): Promise<void> {
    const tableEntity: messageErrorTableEntityType = this.createTableEntity(
      event,
      reason,
    );
    await this.#tableClient.createEntity(tableEntity);
  }
}
