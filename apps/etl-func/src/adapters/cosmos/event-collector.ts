import { EventCollector, EventsSummary } from "@/domain/event.js";
import { TelemetryEventName, TelemetryService } from "@/domain/telemetry.js";
import { Container, ItemResponse } from "@azure/cosmos";

/**
 * Adapter for a cosmos event collector.
 * The goal is to store the number of events
 * into a container using the year as partition key.
 * */
export class CosmosSummaryCollector<T extends { id: string }>
  implements EventCollector<T>
{
  #container: Container;
  #telemetry: TelemetryService;

  /**
   * @param container The name of the container where to store weekly events.
   * @param telemetry The telemetry service to use
   * */
  constructor(container: Container, telemetry: TelemetryService) {
    this.#container = container;
    this.#telemetry = telemetry;
  }

  /**
   * Accept a batch of events and return the summary.
   * */
  private createSummary(events: [T, ...T[]]): EventsSummary {
    return {
      count: events.length,
      id: this.getBatchId(events),
      year: this.getCurrentPartitionKey(),
    };
  }

  /**
   * Returns the id of the first event in the batch.
   *
   * @param events Accept a non empty array
   *
   * @returns The id of the first event
   * */
  private getBatchId(events: [T, ...T[]]): string {
    return events[0].id;
  }

  private getCurrentPartitionKey(): string {
    return new Date().getFullYear().toString();
  }

  /**
   * Insert a new summary into the cosmos container.
   * */
  private insertSummary(
    summary: EventsSummary,
  ): Promise<ItemResponse<EventsSummary>> {
    return this.#container.items.create(summary);
  }

  /**
   * Utility method to collect an ingestion event.
   * This will create a new event summary into the container.
   * If an error occur during the operation then an event is tracked.
   *
   * @param events A non empty array of events
   **/
  async collect(events: [T, ...T[]]): Promise<void> {
    try {
      await this.insertSummary(this.createSummary(events));
    } catch (error) {
      this.#telemetry.trackEvent(TelemetryEventName.COLLECT_COUNT_ERROR, {
        detail: `${error}`,
        eventsCount: events.length,
      });
    }
  }
}
