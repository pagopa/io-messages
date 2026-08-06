import { describe, expect, it } from "vitest";

import { rcConfigurationSchema } from "../../../../../application/ports/rc-configuration.js";
import { toRcConfigurationResponse } from "../get-rc-configuration.dto.js";

describe("toRcConfigurationResponse", () => {
  it("maps the domain configuration to the snake-case API response", () => {
    const configuration = rcConfigurationSchema.parse({
      configurationId: "01JAQ4HYBR5JZCS6K0DT7M1EV8",
      description: "a description",
      disableLollipopFor: ["SPNDNL80R13C555X"],
      hasPrecondition: "ALWAYS",
      id: "an-internal-id",
      isLollipopEnabled: true,
      name: "a name",
      prodEnvironment: {
        baseUrl: "https://example.com",
        detailsAuthentication: {
          cert: {
            clientCert: "client-cert",
            clientKey: "client-key",
            serverCa: "server-ca",
          },
          headerKeyName: "x-api-key",
          key: "secret",
          type: "API_KEY",
        },
      },
      testEnvironment: {
        baseUrl: "https://test.example.com",
        detailsAuthentication: {
          headerKeyName: "x-test-api-key",
          key: "test-secret",
          type: "API_KEY",
        },
        testUsers: ["SPNDNL80R13C555X"],
      },
      userId: "a-user-id",
    });

    expect(toRcConfigurationResponse(configuration)).toEqual({
      configuration_id: "01JAQ4HYBR5JZCS6K0DT7M1EV8",
      description: "a description",
      disable_lollipop_for: ["SPNDNL80R13C555X"],
      has_precondition: "ALWAYS",
      is_lollipop_enabled: true,
      name: "a name",
      prod_environment: {
        base_url: "https://example.com",
        details_authentication: {
          header_key_name: "x-api-key",
          key: "secret",
          type: "API_KEY",
        },
      },
      test_environment: {
        base_url: "https://test.example.com",
        details_authentication: {
          header_key_name: "x-test-api-key",
          key: "test-secret",
          type: "API_KEY",
        },
        test_users: ["SPNDNL80R13C555X"],
      },
      user_id: "a-user-id",
    });
  });
});
