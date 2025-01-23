import {
  EventCollector,
  EventsSummary,
  eventsSummarySchema,
} from "@/domain/event.js";
import { Container, ItemResponse } from "@azure/cosmos";

/**
 * Adapter for a cosmos weekly event collector.
 * The goal is to store into a cosmos container the number of events sent into a
 * container with year as partition key and week number as model id.
 * */
export class CosmosWeeklyEventCollector<T> implements EventCollector<T> {
  #container: Container;

  /**
   * @param container The name of the container where to store weekly events.
   * */
  constructor(container: Container) {
    this.#container = container;
  }

  private createSummary(events: T[]): EventsSummary {
    return {
      count: events.length,
      id: this.getCurrentModelId(),
      year: this.getCurrentPartitionKey(),
    };
  }

  private getCurrentModelId(): string {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const daysSinceStartOfYear = Math.floor(
      (today.getTime() - startOfYear.getTime()) / 86_400_000,
    );
    const weekNumber = Math.ceil(
      (daysSinceStartOfYear + startOfYear.getDay() + 1) / 7,
    );
    return `${today.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
  }

  private getCurrentPartitionKey(): string {
    return new Date().getFullYear().toString();
  }

  private async getSummary(
    modelId: string,
    partitionKey: string,
  ): Promise<ItemResponse<EventsSummary> | undefined> {
    const recordToUpdate = await this.#container
      .item(modelId, partitionKey)
      .read();
    if (recordToUpdate.resource === undefined) return undefined;
    return recordToUpdate;
  }

  private insertSummary(
    summary: EventsSummary,
  ): Promise<ItemResponse<EventsSummary>> {
    return this.#container.items.create(summary);
  }

  /**
   * Utility method to collect an ingestion event.
   * This method will create a new event summary into the container.
   * If an event summary already exists for the week, then it wil patch it
   * updating the counter.
   * */
  async collect(events: T[]): Promise<void> {
    const summaryToUpdate = await this.getSummary(
      this.getCurrentModelId(),
      this.getCurrentPartitionKey(),
    );

    // if there is no summary then we want to create it
    if (summaryToUpdate === undefined)
      await this.insertSummary(this.createSummary(events));
    // if the summary already exists then we want to patch
    else {
      const parsedItemResponse = eventsSummarySchema.parse(
        summaryToUpdate.resource,
      );
      await summaryToUpdate.item.patch({
        operations: [
          {
            op: "replace",
            path: "/count",
            value: (parsedItemResponse.count += events.length),
          },
        ],
      });
    }
  }
}
