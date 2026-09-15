import type { RcConfigurationId } from "io-messages-common/domain/remote-content";

export interface UserRCConfiguration {
  id: RcConfigurationId;
  userId: string;
}

export interface UserRCConfigurationRepository {
  upsert(configuration: UserRCConfiguration): Promise<void>;
}
