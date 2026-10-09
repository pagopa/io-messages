import { describe, expect, it } from "vitest";

import { fiscalCodeSchema } from "../../domain/fiscal-code.js";
import { rcConfigurationSchema } from "../../domain/remote-content.js";
import { RcConfigurationResponseSchema } from "../remote-content.js";

const aResponse = {
  configuration_id: "01JAQ4HYBR5JZCS6K0DT7M1EV8",
  description: "a description",
  disable_lollipop_for: ["SPNDNL80R13C555X"],
  has_precondition: "ALWAYS",
  is_lollipop_enabled: false,
  name: "a name",
  user_id: "a-user-id",
};

describe("remote content contracts", () => {
  it("defines a snake-case response distinct from the domain entity", () => {
    expect(RcConfigurationResponseSchema.safeParse(aResponse).success).toBe(
      true,
    );
    expect(rcConfigurationSchema.safeParse(aResponse).success).toBe(false);
  });

  it("uses the canonical fiscal-code rules in RC configurations", () => {
    const fiscalCode = "spndnl80r13c555x";
    const environment = {
      baseUrl: "https://remote-content.example",
      detailsAuthentication: {
        headerKeyName: "x-api-key",
        key: "secret",
        type: "API_KEY",
      },
    };

    expect(fiscalCodeSchema.safeParse(fiscalCode).success).toBe(true);
    expect(
      RcConfigurationResponseSchema.safeParse({
        ...aResponse,
        disable_lollipop_for: [fiscalCode],
        prod_environment: {
          base_url: environment.baseUrl,
          details_authentication: {
            header_key_name: environment.detailsAuthentication.headerKeyName,
            key: environment.detailsAuthentication.key,
            type: environment.detailsAuthentication.type,
          },
        },
        test_environment: {
          base_url: environment.baseUrl,
          details_authentication: {
            header_key_name: environment.detailsAuthentication.headerKeyName,
            key: environment.detailsAuthentication.key,
            type: environment.detailsAuthentication.type,
          },
          test_users: [fiscalCode],
        },
      }).success,
    ).toBe(true);
    expect(
      rcConfigurationSchema.safeParse({
        configurationId: "01JAQ4HYBR5JZCS6K0DT7M1EV8",
        description: "a description",
        disableLollipopFor: [fiscalCode],
        hasPrecondition: "ALWAYS",
        id: "a-configuration-id",
        isLollipopEnabled: false,
        name: "a name",
        prodEnvironment: environment,
        testEnvironment: { ...environment, testUsers: [fiscalCode] },
        userId: "a-user-id",
      }).success,
    ).toBe(true);
  });
});
