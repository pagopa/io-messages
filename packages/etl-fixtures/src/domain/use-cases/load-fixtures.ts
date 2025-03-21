import { ContentLoader } from "@/adapters/blob/content-loader.js";
import { MetadataLoader } from "@/adapters/cosmos/metadata-loader.js";
import { Logger } from "io-messages-common/types/log";

type LoadFixturesOptions = {
  includeRemoteContents: boolean;
  includePayments: boolean;
};

export class LoadFixturesUseCase {
  metadataLoader: MetadataLoader;
  contentLoader: ContentLoader;
  logger: Logger;

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
      includeRemoteContents: opts.includeRemoteContents,
      includePayments: opts.includePayments,
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
