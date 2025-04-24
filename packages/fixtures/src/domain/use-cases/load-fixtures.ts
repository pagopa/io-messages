import { Logger } from "pino";
import { MessageGeneratorRepository, MessageRepository } from "../message.js";

interface LoadFixturesOptions {
  includePayments: boolean;
  includeRemoteContents: boolean;
}

export class LoadFixturesUseCase {
  logger: Logger;
  messageLoader: MessageRepository;
  messageGenerator: MessageGeneratorRepository;

  constructor(
    messageGenerator: MessageGeneratorRepository,
    messageLoader: MessageRepository,
    logger: Logger,
  ) {
    this.messageLoader = messageLoader;
    this.messageGenerator = messageGenerator;
    this.logger = logger;
  }

  async execute(count: number, opts: LoadFixturesOptions): Promise<void> {
    this.logger.info(`generating ${count} messages`);
    const messages = this.messageGenerator.generate(count, opts);
    this.logger.info(`fixtures generated`);

    this.logger.info(`loading ${count} fixtures`);
    const failed = (
      await Promise.allSettled(
        messages.map((message) => this.messageLoader.loadMessage(message)),
      )
    ).filter((result) => result.status === "rejected");

    if (failed.length > 0) {
      this.logger.error(
        `something went wrong trying to load ${failed.length} fixtures`,
      );
    }

    this.logger.info(
      `total fixtures loaded successfully: ${count - failed.length}`,
    );
  }
}
