import { ContentLoader } from "@/adapters/blob/content-loader.js";
import { MetadataLoader } from "@/adapters/cosmos/metadata-loader.js";
import { Logger } from "io-messages-common/types/log";

interface LoadFixturesOptions {
  includePayments: boolean;
  includeRemoteContents: boolean;
}

export class LoadFixturesUseCase {
  contentLoader: ContentLoader;
  logger: Logger;
  metadataLoader: MetadataLoader;

  constructor(
    metadataLoader: MetadataLoader,
    contentLoader: ContentLoader,
    logger: Logger,
  ) {
    this.metadataLoader = metadataLoader;
    this.contentLoader = contentLoader;
    this.logger = logger;
  }

  async execute(count: number, opts: LoadFixturesOptions): Promise<void> {
    this.logger.info(`Generating ${count} metadatas`);
    const metadatas = this.metadataLoader.generateMany(count);

    this.logger.info(
      `Generating ${count} contents including remote contents: ${opts.includeRemoteContents} and payments: ${opts.includePayments}`,
    );
    const contents = this.contentLoader.generateMany(count, {
      includePayments: opts.includePayments,
      includeRemoteContents: opts.includeRemoteContents,
    });

    const contentsWithIds = contents.map((content, i) => ({
      ...content,
      messageId: metadatas[i].id,
    }));

    metadatas.forEach((m) => this.logger.info(`Generated metadata: ${m.id}`));

    try {
      this.logger.info(`Loading ${count} metadatas`);
      await this.metadataLoader.load(metadatas);

      this.logger.info(`Loading ${count} contents`);
      await this.contentLoader.load(contentsWithIds);
      this.logger.info(`${count} fixtures loaded successfully`);
    } catch (error) {
      this.logger.error(`Something went wrong: ${error}`);
    }
  }
}
