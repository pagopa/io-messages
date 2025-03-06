import { EventCollector, EventsSummary } from "@/domain/event.js";
import { TelemetryEventName, TelemetryService } from "@/domain/telemetry.js";
import { Container, ItemResponse } from "@azure/cosmos";
import { ulid } from "ulid";

/**
 * Adapter for a cosmos event collector.
 * The goal is to store the number of events
 * into a container using the year as partition key.
 * */
export class CosmosIngestionCollector implements EventCollector {
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
  async collect(count: number): Promise<void> {
    const batchId = ulid();
    try {
      await this.insertSummary({
        count,
        id: batchId,
        year: new Date().getFullYear().toString(),
      });
    } catch (error) {
      this.#telemetry.trackEvent(TelemetryEventName.COLLECT_COUNT_ERROR, {
        batchId,
        detail: `${error}`,
        eventsCount: count,
      });
    }
  }
}
