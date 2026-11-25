import { InvocationContext } from "@azure/functions";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  TelemetryEventName,
  TelemetryService,
} from "../../../domain/telemetry.js";
import { AlignRemoteContentConfigurationUseCase } from "../../../domain/use-cases/align-remote-content-configuration.js";
import remoteContentMessageConfigurationChangeFeedHandler from "../remote-content-message-configuration-change-feed.js";

const executeMock = vi.fn();
const trackEventMock = vi.fn();
const contextErrorMock = vi.fn();

const alignRemoteContentConfiguration = {
  execute: executeMock,
} as unknown as AlignRemoteContentConfigurationUseCase;
const telemetryService = {
  trackEvent: trackEventMock,
} as TelemetryService;
const context = {
  error: contextErrorMock,
  invocationId: "an-invocation-id",
} as unknown as InvocationContext;

const validConfiguration = {
  configurationId: "01HMRBX079WA5SGYBQP1A7FSKH",
  description: "description",
  disableLollipopFor: [],
  hasPrecondition: "ALWAYS",
  id: "01HMRBX079WA5SGYBQP1A7FSKH",
  isLollipopEnabled: true,
  name: "name",
  prodEnvironment: {
    baseUrl: "https://example.com",
    detailsAuthentication: {
      headerKeyName: "x-api-key",
      key: "key",
      type: "API_KEY",
    },
  },
  userId: "aUserId",
};

const handler = remoteContentMessageConfigurationChangeFeedHandler(
  alignRemoteContentConfiguration,
  telemetryService,
);

describe("remoteContentMessageConfigurationChangeFeedHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeMock.mockResolvedValue(undefined);
  });

  test("does nothing for an empty batch", async () => {
    await handler([], context);

    expect(executeMock).not.toHaveBeenCalled();
  });

  test("aligns valid configurations in order", async () => {
    const anotherConfiguration = {
      ...validConfiguration,
      configurationId: "01HNG1XBMT8V6HWGF5T053K9RJ",
    };

    await handler([validConfiguration, anotherConfiguration], context);

    expect(executeMock).toHaveBeenNthCalledWith(1, validConfiguration);
    expect(executeMock).toHaveBeenNthCalledWith(2, anotherConfiguration);
  });

  test("reports malformed configurations and continues the batch", async () => {
    const malformedConfiguration = {
      ...validConfiguration,
      configurationId: "not-a-ulid",
    };

    await handler([malformedConfiguration, validConfiguration], context);

    expect(executeMock).toHaveBeenCalledOnce();
    expect(executeMock).toHaveBeenCalledWith(validConfiguration);
    expect(contextErrorMock).not.toHaveBeenCalled();
    expect(trackEventMock).toHaveBeenCalledWith(
      TelemetryEventName.REMOTE_CONTENT_CHANGE_FEED_PARSE_FAILURE,
      {
        detail: "Invalid configuration document",
        invocationId: context.invocationId,
      },
    );
  });

  test("propagates and reports repository failures", async () => {
    const error = new Error("Cosmos upsert failed");
    executeMock.mockRejectedValueOnce(error);

    await expect(handler([validConfiguration], context)).rejects.toThrow(error);

    expect(contextErrorMock).toHaveBeenCalledWith(error.message);
    expect(trackEventMock).toHaveBeenCalledWith(
      TelemetryEventName.REMOTE_CONTENT_CHANGE_FEED_RETRY_FAILURE,
      expect.objectContaining({ detail: error.message }),
    );
  });
});
