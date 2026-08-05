import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import {
  RCConfigurationResponse,
  rcConfigurationResponseSchema,
} from "io-messages-common/adapters/outbound/remote-content";
import { Result, ResultAsync, err, ok } from "neverthrow";

import {
  RCConfiguration,
  RCConfigurationRepository,
} from "../../../application/ports/rc-configuration.js";

type RCEnvironmentResponse = NonNullable<
  RCConfigurationResponse["prod_environment"]
>;

const toDomainEnvironment = (
  environment: RCEnvironmentResponse,
): NonNullable<RCConfiguration["prodEnvironment"]> => ({
  baseUrl: environment.base_url,
  detailsAuthentication: {
    cert:
      environment.details_authentication.cert === undefined
        ? undefined
        : {
            clientCert: environment.details_authentication.cert.client_cert,
            clientKey: environment.details_authentication.cert.client_key,
            serverCa: environment.details_authentication.cert.server_ca,
          },
    headerKeyName: environment.details_authentication.header_key_name,
    key: environment.details_authentication.key,
    type: environment.details_authentication.type,
  },
});

export class RCConfigurationHttpClientAdapter
  implements RCConfigurationRepository
{
  #rcAppBaseURL: URL;

  constructor(rcAppBaseURL: URL) {
    this.#rcAppBaseURL = rcAppBaseURL;
  }

  private toDomainRCConfiguration(
    rcConfigurationApiResponse: RCConfigurationResponse,
  ): RCConfiguration {
    return {
      configurationId: rcConfigurationApiResponse.configuration_id,
      description: rcConfigurationApiResponse.description,
      disableLollipopFor: rcConfigurationApiResponse.disable_lollipop_for,
      hasPrecondition: rcConfigurationApiResponse.has_precondition,
      isLollipopEnabled: rcConfigurationApiResponse.is_lollipop_enabled,
      name: rcConfigurationApiResponse.name,
      prodEnvironment:
        rcConfigurationApiResponse.prod_environment === undefined
          ? undefined
          : toDomainEnvironment(rcConfigurationApiResponse.prod_environment),
      testEnvironment:
        rcConfigurationApiResponse.test_environment === undefined
          ? undefined
          : {
              ...toDomainEnvironment(
                rcConfigurationApiResponse.test_environment,
              ),
              testUsers: rcConfigurationApiResponse.test_environment.test_users,
            },
      userId: rcConfigurationApiResponse.user_id,
    };
  }

  async getRemoteContentConfiguration(
    id: string,
  ): Promise<
    Result<RCConfiguration, GenericError | NotFoundError | TooManyRequestsError>
  > {
    const response = await ResultAsync.fromPromise(
      fetch(`${this.#rcAppBaseURL}/${id}`),
      (err) => new GenericError(String(err)),
    );

    if (response.isErr()) return err(response.error);

    if (response.value.status === 200) {
      const jsonResponse = await ResultAsync.fromPromise(
        response.value.json(),
        () => new GenericError("invalid json response from rc-app"),
      );

      if (jsonResponse.isErr()) {
        return err(jsonResponse.error);
      }

      const parsedResult = rcConfigurationResponseSchema.safeParse(
        jsonResponse.value,
      );

      if (!parsedResult.success)
        return err(
          new GenericError(
            `malformed remote content configuration returned by the rc-app: ${parsedResult.error.message}`,
          ),
        );

      return ok(this.toDomainRCConfiguration(parsedResult.data));
    }

    switch (response.value.status) {
      case 400:
        return err(
          new GenericError(
            `malformed request trying to obtain the remote-content configuration with id: ${id}: ${response.value.body}`,
          ),
        );

      case 404:
        return err(
          new NotFoundError(
            `remote-content configuration`,
            `cannot find remote content configuration with ID: ${id}`,
          ),
        );

      case 429:
        return err(new TooManyRequestsError());

      default:
        return err(
          new GenericError(
            `something went wrong trying to obtain the remote-content configuration with id: ${id}: ${JSON.stringify(response.value.body)}`,
          ),
        );
    }
  }
}
