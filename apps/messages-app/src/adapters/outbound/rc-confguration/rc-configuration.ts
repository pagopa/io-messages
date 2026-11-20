import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import {
  type RcConfigurationResponse,
  RcConfigurationResponseSchema,
} from "io-messages-common/adapters/remote-content";
import { Result, ResultAsync, err, ok } from "neverthrow";

import {
  RCConfiguration,
  RCConfigurationRepository,
  rcConfigurationSchema,
} from "../../../application/ports/rc-configuration.js";
import {
  reportUpstreamFailure,
  reportUpstreamStatus,
} from "../../../application/telemetry.js";

type RcEnvironmentResponse = NonNullable<
  RcConfigurationResponse["prod_environment"]
>;

const toDomainEnvironment = (environment: RcEnvironmentResponse) => ({
  baseUrl: environment.base_url,
  detailsAuthentication: {
    headerKeyName: environment.details_authentication.header_key_name,
    key: environment.details_authentication.key,
    type: environment.details_authentication.type,
  },
});

export class RCConfigurationHttpClientAdapter
  implements RCConfigurationRepository
{
  #rcAppBaseURL: URL;

  constructor(
    rcAppBaseURL: URL,
    private readonly logger?: Logger,
  ) {
    this.#rcAppBaseURL = rcAppBaseURL;
  }

  private toDomainRCConfiguration(
    response: RcConfigurationResponse,
  ): Result<RCConfiguration, GenericError> {
    const parsedResult = rcConfigurationSchema.safeParse({
      configurationId: response.configuration_id,
      description: response.description,
      disableLollipopFor: response.disable_lollipop_for,
      hasPrecondition: response.has_precondition,
      id: response.configuration_id,
      isLollipopEnabled: response.is_lollipop_enabled,
      name: response.name,
      prodEnvironment: response.prod_environment
        ? toDomainEnvironment(response.prod_environment)
        : undefined,
      testEnvironment: response.test_environment
        ? {
            ...toDomainEnvironment(response.test_environment),
            testUsers: response.test_environment.test_users,
          }
        : undefined,
      userId: response.user_id,
    });

    return parsedResult.success
      ? ok(parsedResult.data)
      : err(
          new GenericError(
            `malformed remote content configuration returned by the rc-app: ${parsedResult.error.message}`,
          ),
        );
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

    const operation = "getRemoteContentConfiguration";
    if (response.isErr()) {
      reportUpstreamFailure(this.logger, "rc-app", operation, "no_response");
      return err(response.error);
    }

    if (response.value.status === 200) {
      const jsonResponse = await ResultAsync.fromPromise(
        response.value.json(),
        () => new GenericError("invalid json response from rc-app"),
      );

      if (jsonResponse.isErr()) {
        reportUpstreamFailure(
          this.logger,
          "rc-app",
          operation,
          "invalid_response",
          200,
        );
        return err(jsonResponse.error);
      }

      const parsedResult = RcConfigurationResponseSchema.safeParse(
        jsonResponse.value,
      );

      if (!parsedResult.success) {
        reportUpstreamFailure(
          this.logger,
          "rc-app",
          operation,
          "invalid_response",
          200,
        );
        return err(
          new GenericError(
            `malformed remote content configuration returned by the rc-app: ${parsedResult.error.message}`,
          ),
        );
      }

      const configuration = this.toDomainRCConfiguration(parsedResult.data);
      if (configuration.isErr()) {
        reportUpstreamFailure(
          this.logger,
          "rc-app",
          operation,
          "invalid_response",
          200,
        );
      }
      return configuration;
    }

    if (response.value.status !== 404) {
      reportUpstreamStatus(
        this.logger,
        "rc-app",
        operation,
        response.value.status,
      );
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
