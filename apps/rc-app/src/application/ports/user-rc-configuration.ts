import type {
  GenericError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import type { Result } from "neverthrow";

export interface UserRCConfiguration {
  id: string;
  userId: string;
}

export interface UserRCConfigurationRepository {
  /**
   * Returns all RC configuration links associated with the provided user ID.
   */
  listUserRCConfigurations(
    userId: string,
  ): Promise<
    Result<UserRCConfiguration[], GenericError | TooManyRequestsError>
  >;
}
