import { ContentLoader } from "@/adapters/blob/content-loader.js";
import { MetadataLoader } from "@/adapters/cosmos/metadata-loader.js";
import { pino } from "pino";
import { describe, it, expect, vi } from "vitest";
import { LoadFixturesUseCase } from "../load-fixtures.js";
import { Logger } from "io-messages-common/types/log";

const generateManyMetadataMock = vi
  .fn()
  .mockReturnValue([{ id: "1" }, { id: "2" }]);
const loadMetadataMock = vi.fn();

const metadataLoader = {
  generateMany: generateManyMetadataMock,
  load: loadMetadataMock,
} as unknown as MetadataLoader;

const generateManyContentMock = vi
  .fn()
  .mockReturnValue([{ content: "content1" }, { content: "content2" }]);
const loadContentMock = vi.fn();

const contentLoader = {
  generateMany: generateManyContentMock,
  load: loadContentMock,
} as unknown as ContentLoader;

const infoMock = vi.fn();
const errorMock = vi.fn();
const logMock = vi.fn();

const logger: Logger = {
  info: infoMock,
  error: errorMock,
  log: logMock,
};

const loadFixturesUseCase = new LoadFixturesUseCase(
  metadataLoader,
  contentLoader,
  logger,
);

describe("LoadFixturesUseCase.execute", () => {
  it("should generate and load fixtures successfully", async () => {
    const count = 2;
    const opts = { includeRemoteContents: true, includePayments: true };

    await loadFixturesUseCase.execute(count, opts);

    expect(infoMock).toHaveBeenCalledWith(`Generating ${count} metadatas`);
    expect(generateManyMetadataMock).toHaveBeenCalledWith(count);
    expect(infoMock).toHaveBeenCalledWith(
      `Generating ${count} contents including remote contents: ${opts.includeRemoteContents} and payments: ${opts.includePayments}`,
    );
    expect(generateManyContentMock).toHaveBeenCalledWith(count, opts);
    expect(infoMock).toHaveBeenCalledWith(`Loading ${count} metadatas`);
    expect(loadMetadataMock).toHaveBeenCalledWith([{ id: "1" }, { id: "2" }]);
    expect(infoMock).toHaveBeenCalledWith(`Loading ${count} contents`);
    expect(loadContentMock).toHaveBeenCalledWith([
      { content: "content1", messageId: "1" },
      { content: "content2", messageId: "2" },
    ]);
    expect(infoMock).toHaveBeenCalledWith(
      `${count} fixtures loaded successfully`,
    );
  });

  it("should log an error if something goes wrong loading metadatas", async () => {
    const count = 2;
    const opts = { includeRemoteContents: true, includePayments: true };
    const error = new Error("Test error");
    loadMetadataMock.mockRejectedValueOnce(error);

    await loadFixturesUseCase.execute(count, opts);

    expect(logger.error).toHaveBeenCalledWith(`Something went wrong: ${error}`);
  });

  it("should log an error if something goes wrong loading content", async () => {
    const count = 2;
    const opts = { includeRemoteContents: true, includePayments: true };
    const error = new Error("Test error");
    loadContentMock.mockRejectedValueOnce(error);

    await loadFixturesUseCase.execute(count, opts);

    expect(logger.error).toHaveBeenCalledWith(`Something went wrong: ${error}`);
  });
});
