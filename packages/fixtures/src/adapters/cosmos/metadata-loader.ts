import { Container } from "@azure/cosmos";
import {
  FiscalCode,
  fiscalCodeSchema,
} from "io-messages-common/domain/fiscal-code";
import { MessageMetadata } from "io-messages-common/types/message";
import { ulid } from "ulid";
import { z } from "zod";

const TEST_FISCAL_CODES = z
  .array(fiscalCodeSchema)
  .parse([
    "LVTEST00A00A195X",
    "LVTEST00A00A196X",
    "LVTEST00A00A197X",
    "LVTEST00A00A198X",
    "LVTEST00A00A199X",
  ]);

export interface MetadataLoader {
  generate: () => MessageMetadata;
  generateMany: (count: number) => MessageMetadata[];
  load: (metadata: MessageMetadata[]) => Promise<void>;
}

export class CosmosMetadataLoader implements MetadataLoader {
  container: Container;
  constructor(metadataContainer: Container) {
    this.container = metadataContainer;
  }

  private getRandomTestFiscalCode(testFiscalCodes: FiscalCode[]): FiscalCode {
    return testFiscalCodes[Math.floor(Math.random() * testFiscalCodes.length)];
  }

  /**
   * Generates a MessageMetadata object with random values.
   *
   * @returns A MessageMetadata object with generated values.
   */
  generate(): MessageMetadata {
    const id = ulid();
    return {
      createdAt: new Date().toISOString(),
      featureLevelType: "STANDARD",
      fiscalCode: this.getRandomTestFiscalCode(TEST_FISCAL_CODES),
      id,
      indexedId: id,
      isPending: Math.random() > 0.5,
      senderServiceId: ulid(),
      senderUserId: ulid(),
      timeToLiveSeconds: 3600,
    };
  }

  /**
   * Generates multiple MessageMetadata objects.
   *
   * @param count - The number of MessageMetadata objects to generate. Must be at least 1.
   * @returns An array of MessageMetadata objects.
   */
  generateMany(count: number): MessageMetadata[] {
    return Array.from({ length: count }, () => this.generate());
  }

  async load(metadata: MessageMetadata[]): Promise<void> {
    await Promise.all(metadata.map((m) => this.container.items.create(m)));
  }
}
