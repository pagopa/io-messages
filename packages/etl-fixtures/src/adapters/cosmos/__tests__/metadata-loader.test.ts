import { describe, test, expect, vi } from "vitest";
import { CosmosMetadataLoader } from "../metadata-loader.js";
import { Container } from "@azure/cosmos";
import { MessageMetadata } from "io-messages-common/types/message";
import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";

const createMock = vi.fn().mockResolvedValue({});

const metadataContainer = {
  items: { create: createMock },
} as unknown as Container;

const metadataLoader = new CosmosMetadataLoader(metadataContainer);

const fiscalCodeMock = fiscalCodeSchema.parse("LVTEST00A00A195X");

const metadataMock: MessageMetadata[] = [
  {
    id: "1",
    createdAt: new Date().toISOString(),
    fiscalCode: fiscalCodeMock,
    featureLevelType: "STANDARD",
    indexedId: "1",
    isPending: false,
    senderServiceId: "1",
    senderUserId: "1",
    timeToLiveSeconds: 3600,
  },
  {
    id: "2",
    createdAt: new Date().toISOString(),
    fiscalCode: fiscalCodeMock,
    featureLevelType: "STANDARD",
    indexedId: "2",
    isPending: false,
    senderServiceId: "2",
    senderUserId: "2",
    timeToLiveSeconds: 3600,
  },
];

describe("CosmosMetadataLoader.generate", () => {
  test("should generate a single message metadata", () => {
    const result = metadataLoader.generate();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("createdAt");
  });
});

describe("CosmosMetadataLoader.generateMany", () => {
  test("should generate the correct number of message metadata", () => {
    const count = 3;
    const result = metadataLoader.generateMany(count);

    expect(result).toHaveLength(count);
    result.forEach((metadata) => {
      expect(metadata).toBeDefined();
      expect(metadata).toHaveProperty("id");
      expect(metadata).toHaveProperty("createdAt");
    });
  });
});

describe("CosmosMetadataLoader.load", () => {
  test("should load metadata into the container", async () => {
    await metadataLoader.load(metadataMock);

    expect(createMock).toHaveBeenCalledTimes(metadataMock.length);
    metadataMock.forEach((m) => {
      expect(createMock).toHaveBeenCalledWith(m);
    });
  });
});
