import {
  FiscalCodeSchema,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";
import z from "zod";

import {
  RCConfiguration,
  RCConfigurationRepository,
} from "../../../application/ports/rc-configuration.js";

const rcClientCertSchema = z.object({
  clientCert: z.string().min(1),
  clientKey: z.string().min(1),
  serverCa: z.string().min(1),
});

const rcAuthenticationConfigSchema = z.object({
  cert: rcClientCertSchema.optional(),
  headerKeyName: z.string().min(1),
  key: z.string().min(1),
  type: z.string().min(1),
});

const rcEnvironmentConfigSchema = z.object({
  baseUrl: z.string().min(1),
  detailsAuthentication: rcAuthenticationConfigSchema,
});

const rcTestEnvironmentConfigSchema = rcEnvironmentConfigSchema.extend({
  testUsers: z.array(FiscalCodeSchema),
});

// rcConfigurationApiResponseSchema represents the remote-content configuration
// obtained as response from the rc-app micro-service.
const rcConfigurationApiResponseSchema = z.object({
  configurationId: z.ulid(),
  description: z.string().min(1),
  disableLollipopFor: z.array(FiscalCodeSchema),
  hasPrecondition: z.enum(["ALWAYS", "ONCE", "NEVER"]),
  id: z.string().min(1),
  isLollipopEnabled: z.boolean(),
  name: z.string().min(1),
  prodEnvironment: rcEnvironmentConfigSchema.optional(),
  testEnvironment: rcTestEnvironmentConfigSchema.optional(),
  userId: z.string().min(1),
});
type RCConfigurationApiResponse = z.infer<
  typeof rcConfigurationApiResponseSchema
>;

export class RCConfigurationHttpClientAdapter
  implements RCConfigurationRepository
{
  #rcAppBaseURL: URL;

  constructor(rcAppBaseURL: URL) {
    this.#rcAppBaseURL = rcAppBaseURL;
  }

  private toDomainRCConfiguration(
    rcConfigurationApiResponse: RCConfigurationApiResponse,
  ): RCConfiguration {
    return {
      configurationId: rcConfigurationApiResponse.configurationId,
      description: rcConfigurationApiResponse.description,
      disableLollipopFor: rcConfigurationApiResponse.disableLollipopFor,
      hasPrecondition: rcConfigurationApiResponse.hasPrecondition,
      id: rcConfigurationApiResponse.id,
      isLollipopEnabled: rcConfigurationApiResponse.isLollipopEnabled,
      name: rcConfigurationApiResponse.name,
      prodEnvironment: rcConfigurationApiResponse.prodEnvironment,
      testEnvironment: rcConfigurationApiResponse.testEnvironment,
      userId: rcConfigurationApiResponse.userId,
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

      const parsedResult = rcConfigurationApiResponseSchema.safeParse(
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
