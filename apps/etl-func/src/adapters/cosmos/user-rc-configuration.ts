import { Container } from "@azure/cosmos";

import {
  UserRCConfiguration,
  UserRCConfigurationRepository,
} from "../../domain/remote-content.js";

export class CosmosUserRCConfigurationRepository
  implements UserRCConfigurationRepository
{
  #container: Container;

  constructor(container: Container) {
    this.#container = container;
  }

  async upsert(configuration: UserRCConfiguration): Promise<void> {
    await this.#container.items.upsert(configuration);
  }
}
