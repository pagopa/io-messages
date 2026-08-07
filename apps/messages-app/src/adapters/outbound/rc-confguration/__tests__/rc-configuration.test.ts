import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RCConfigurationHttpClientAdapter } from "../rc-configuration.js";

const RC_CONFIG_ID = "01JAQ4HYBR5JZCS6K0DT7M1EV8";
const aBaseURL = new URL("http://localhost/api/internal/rc-configurations");

const anApiResponse = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  configuration_id: RC_CONFIG_ID,
  description: "a description",
  disable_lollipop_for: [],
  has_precondition: "ALWAYS",
  is_lollipop_enabled: false,
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
    test_users: [],
  },
  user_id: "a-user-id",
  ...overrides,
});

const aFetchResponse = (
  status: number,
  json: () => Promise<unknown> = () => Promise.resolve({}),
): Response => ({ json, status }) as unknown as Response;

const stubFetch = (response: Error | Response): void => {
  if (response instanceof Error) {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(response));
    return;
  }
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
};

const adapter = new RCConfigurationHttpClientAdapter(aBaseURL);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("RCConfigurationHttpClientAdapter - getRemoteContentConfiguration", () => {
  it("returns the mapped domain configuration on a 200 response", async () => {
    stubFetch(aFetchResponse(200, () => Promise.resolve(anApiResponse())));

    const result = await adapter.getRemoteContentConfiguration(RC_CONFIG_ID);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      configurationId: RC_CONFIG_ID,
      description: "a description",
      disableLollipopFor: [],
      hasPrecondition: "ALWAYS",
      id: RC_CONFIG_ID,
      isLollipopEnabled: false,
      name: "a name",
      prodEnvironment: {
        baseUrl: "https://example.com",
        detailsAuthentication: {
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
        testUsers: [],
      },
      userId: "a-user-id",
    });
    expect(fetch).toHaveBeenCalledWith(`${aBaseURL}/${RC_CONFIG_ID}`);
  });

  it("returns a GenericError when the fetch itself rejects", async () => {
    stubFetch(new Error("network down"));

    const result = await adapter.getRemoteContentConfiguration(RC_CONFIG_ID);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("returns a GenericError when the 200 response body is not valid JSON", async () => {
    stubFetch(
      aFetchResponse(200, () => Promise.reject(new Error("invalid json"))),
    );

    const result = await adapter.getRemoteContentConfiguration(RC_CONFIG_ID);

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(GenericError);
    expect(error.message).toContain("invalid json response from rc-app");
  });

  it("returns a GenericError when the 200 response does not match the schema", async () => {
    stubFetch(
      aFetchResponse(200, () =>
        Promise.resolve(
          anApiResponse({ has_precondition: "NOT_A_VALID_VALUE" }),
        ),
      ),
    );

    const result = await adapter.getRemoteContentConfiguration(RC_CONFIG_ID);

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(GenericError);
    expect(error.message).toContain("malformed remote content configuration");
  });

  it("returns a GenericError on a 400 response", async () => {
    stubFetch(aFetchResponse(400));

    const result = await adapter.getRemoteContentConfiguration(RC_CONFIG_ID);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("returns a NotFoundError on a 404 response", async () => {
    stubFetch(aFetchResponse(404));

    const result = await adapter.getRemoteContentConfiguration(RC_CONFIG_ID);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it("returns a TooManyRequestsError on a 429 response", async () => {
    stubFetch(aFetchResponse(429));

    const result = await adapter.getRemoteContentConfiguration(RC_CONFIG_ID);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
  });

  it("returns a GenericError on an unexpected status code", async () => {
    stubFetch(aFetchResponse(500));

    const result = await adapter.getRemoteContentConfiguration(RC_CONFIG_ID);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
