import { FiscalCodeSchema } from "@pagopa/hexagonal-core";
import z from "zod";

import { RCConfiguration } from "../../../../application/ports/rc-configuration.js";

const RcAuthenticationConfigPublicSchema = z.object({
  header_key_name: z.string().min(1),
  key: z.string().min(1),
  type: z.string().min(1),
});

const RcEnvironmentConfigPublicSchema = z.object({
  base_url: z.string().min(1),
  details_authentication: RcAuthenticationConfigPublicSchema,
});

const RcTestEnvironmentConfigPublicSchema =
  RcEnvironmentConfigPublicSchema.extend({
    test_users: z.array(FiscalCodeSchema),
  });

export const RcConfigurationPublicResponseSchema = z.object({
  configuration_id: z.ulid(),
  description: z.string().min(1),
  disable_lollipop_for: z.array(FiscalCodeSchema),
  has_precondition: z.enum(["ALWAYS", "ONCE", "NEVER"]),
  is_lollipop_enabled: z.boolean(),
  name: z.string().min(1),
  prod_environment: RcEnvironmentConfigPublicSchema.optional(),
  test_environment: RcTestEnvironmentConfigPublicSchema.optional(),
  user_id: z.string().min(1),
});

const toPublicEnvironment = (
  environment: NonNullable<RCConfiguration["prodEnvironment"]>,
): z.TypeOf<typeof RcEnvironmentConfigPublicSchema> => ({
  base_url: environment.baseUrl,
  details_authentication: {
    header_key_name: environment.detailsAuthentication.headerKeyName,
    key: environment.detailsAuthentication.key,
    type: environment.detailsAuthentication.type,
  },
});

export const toRcConfigurationPublicResponse = (
  configuration: RCConfiguration,
): z.TypeOf<typeof RcConfigurationPublicResponseSchema> => ({
  configuration_id: configuration.configurationId,
  description: configuration.description,
  disable_lollipop_for: configuration.disableLollipopFor,
  has_precondition: configuration.hasPrecondition,
  is_lollipop_enabled: configuration.isLollipopEnabled,
  name: configuration.name,
  prod_environment:
    configuration.prodEnvironment === undefined
      ? undefined
      : toPublicEnvironment(configuration.prodEnvironment),
  test_environment:
    configuration.testEnvironment === undefined
      ? undefined
      : {
          ...toPublicEnvironment(configuration.testEnvironment),
          test_users: configuration.testEnvironment.testUsers,
        },
  user_id: configuration.userId,
});
