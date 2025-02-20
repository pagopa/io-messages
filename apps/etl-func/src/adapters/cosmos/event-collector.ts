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
      id: events[0].id,
      year: this.getCurrentPartitionKey(),
    };
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
   * Utility guard to check that the array in input is not empty
   **/
  private isNonEmpty<T>(array: T[]): array is [T, ...T[]] {
    return array.length >= 1;
  }

  /**
   * Utility method to collect an ingestion event.
   * This will create a new event summary into the container.
   * If an error occur during the operation then an event is tracked.
   *
   * @param events A non empty array of events
   **/
  async collect(events: T[]): Promise<void> {
    if (!this.isNonEmpty(events)) return;
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
