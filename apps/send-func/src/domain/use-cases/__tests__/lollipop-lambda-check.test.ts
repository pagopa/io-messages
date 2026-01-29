import {
  aLollipopLambdaHeaders,
  aLollipopLambdaQuery,
  aLollipopLambdaRequestBody,
  aLollipopLambdaSuccessResponse,
  createMockLollipopLambdaClient,
} from "@/__mocks__/lollipop-lambda.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LambdaLollipopCheckUseCase } from "../lollipop-lambda-check.js";

const lollipopLambdaClient = createMockLollipopLambdaClient();

const getLollipopLambdaClient = () => lollipopLambdaClient;

describe("LambdaLollipopCheckUseCase with GET method", () => {
  const getLollipopCheckUseCase = new LambdaLollipopCheckUseCase(
    getLollipopLambdaClient,
    "GET",
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the lollipopLambdaClient checkWithGet when method is GET", async () => {
    await expect(
      getLollipopCheckUseCase.execute(
        aLollipopLambdaHeaders,
        aLollipopLambdaQuery,
      ),
    ).resolves.toBe(aLollipopLambdaSuccessResponse);

    expect(lollipopLambdaClient.checkWithGet).toHaveBeenCalledOnce();
    expect(lollipopLambdaClient.checkWithGet).toHaveBeenCalledWith(
      aLollipopLambdaHeaders,
      aLollipopLambdaQuery,
    );
    expect(lollipopLambdaClient.checkWithPost).not.toHaveBeenCalled();
  });

  it("calls checkWithGet without query parameters when not provided", async () => {
    await expect(
      getLollipopCheckUseCase.execute(aLollipopLambdaHeaders),
    ).resolves.toBe(aLollipopLambdaSuccessResponse);

    expect(lollipopLambdaClient.checkWithGet).toHaveBeenCalledOnce();
    expect(lollipopLambdaClient.checkWithGet).toHaveBeenCalledWith(
      aLollipopLambdaHeaders,
      undefined,
    );
  });
});

describe("LambdaLollipopCheckUseCase with POST method", () => {
  const postLollipopCheckUseCase = new LambdaLollipopCheckUseCase(
    getLollipopLambdaClient,
    "POST",
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the lollipopLambdaClient checkWithPost when method is POST", async () => {
    await expect(
      postLollipopCheckUseCase.execute(
        aLollipopLambdaHeaders,
        aLollipopLambdaQuery,
        aLollipopLambdaRequestBody,
      ),
    ).resolves.toBe(aLollipopLambdaSuccessResponse);

    expect(lollipopLambdaClient.checkWithPost).toHaveBeenCalledOnce();
    expect(lollipopLambdaClient.checkWithPost).toHaveBeenCalledWith(
      aLollipopLambdaHeaders,
      aLollipopLambdaQuery,
      aLollipopLambdaRequestBody,
    );
    expect(lollipopLambdaClient.checkWithGet).not.toHaveBeenCalled();
  });

  it("calls checkWithPost without query and body when not provided", async () => {
    await expect(
      postLollipopCheckUseCase.execute(aLollipopLambdaHeaders),
    ).resolves.toBe(aLollipopLambdaSuccessResponse);

    expect(lollipopLambdaClient.checkWithPost).toHaveBeenCalledOnce();
    expect(lollipopLambdaClient.checkWithPost).toHaveBeenCalledWith(
      aLollipopLambdaHeaders,
      undefined,
      undefined,
    );
  });

  it("calls checkWithPost with query but without body", async () => {
    await expect(
      postLollipopCheckUseCase.execute(
        aLollipopLambdaHeaders,
        aLollipopLambdaQuery,
      ),
    ).resolves.toBe(aLollipopLambdaSuccessResponse);

    expect(lollipopLambdaClient.checkWithPost).toHaveBeenCalledOnce();
    expect(lollipopLambdaClient.checkWithPost).toHaveBeenCalledWith(
      aLollipopLambdaHeaders,
      aLollipopLambdaQuery,
      undefined,
    );
  });
});
