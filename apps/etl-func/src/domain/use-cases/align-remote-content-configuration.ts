import type { RCConfiguration } from "io-messages-common/domain/remote-content";

import { UserRCConfigurationRepository } from "../remote-content.js";

export class AlignRemoteContentConfigurationUseCase {
  #repository: UserRCConfigurationRepository;

  constructor(repository: UserRCConfigurationRepository) {
    this.#repository = repository;
  }

  async execute(configuration: RCConfiguration): Promise<void> {
    await this.#repository.upsert({
      id: configuration.configurationId,
      userId: configuration.userId,
    });
  }
}
