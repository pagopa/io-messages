import { Logger } from "pino";
import { describe, expect, test, vi } from "vitest";

import { LoadFixturesUseCase } from "../load-fixtures.js";
import {
  MessageGeneratorRepository,
  MessageRepository,
} from "@/domain/message.js";

const infoMock = vi.fn();
const errorMock = vi.fn();
const logMock = vi.fn();

const logger = {
  error: errorMock,
  info: infoMock,
  log: logMock,
} as unknown as Logger;

const generateMock = vi.fn();

const messageGenerator: MessageGeneratorRepository = {
  generate: generateMock,
};

const loadMessageMock = vi.fn();
const messageLoader: MessageRepository = {
  loadMessage: loadMessageMock,
};

const useCase = new LoadFixturesUseCase(
  messageGenerator,
  messageLoader,
  logger,
);

describe("LoadFixturesUseCase", () => {
  test("should log the number of generated messages", async () => {
    generateMock.mockReturnValue([{ id: 1 }, { id: 2 }]);
    loadMessageMock.mockResolvedValue(undefined);

    await useCase.execute(2, {
      includePayments: false,
      includeRemoteContents: false,
    });

    expect(logger.info).toHaveBeenCalledWith("generating 2 messages");
    expect(logger.info).toHaveBeenCalledWith("fixtures generated");
  });

  test("should log the number of successfully loaded fixtures", async () => {
    generateMock.mockReturnValue([{ id: 1 }, { id: 2 }]);
    loadMessageMock.mockResolvedValue(undefined);

    await useCase.execute(2, {
      includeRemoteContents: false,
      includePayments: false,
    });

    expect(logger.info).toHaveBeenCalledWith(
      "total fixtures loaded successfully: 2",
    );
  });

  test("should log an error if some fixtures fail to load", async () => {
    generateMock.mockReturnValue([{ id: 1 }, { id: 2 }]);
    loadMessageMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Failed"));

    await useCase.execute(2, {
      includePayments: false,
      includeRemoteContents: false,
    });

    expect(logger.error).toHaveBeenCalledWith(
      "something went wrong trying to load 1 fixtures",
    );
    expect(logger.info).toHaveBeenCalledWith(
      "total fixtures loaded successfully: 1",
    );
  });
});
