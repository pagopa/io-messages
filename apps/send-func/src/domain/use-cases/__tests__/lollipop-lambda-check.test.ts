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
const uatLollipopLambdaClient = createMockLollipopLambdaClient();

const getLollipopLambdaClient = (isTest: boolean) =>
  isTest ? uatLollipopLambdaClient : lollipopLambdaClient;

const lollipopCheckUseCase = new LambdaLollipopCheckUseCase(
  getLollipopLambdaClient,
);

describe("LambdaLollipopCheckUseCase with GET method", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the prod lollipopLambdaClient checkWithGet when method is GET and isTest is false", async () => {
    await expect(
      lollipopCheckUseCase.execute(
        false,
        "GET",
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
    expect(uatLollipopLambdaClient.checkWithGet).not.toHaveBeenCalled();
  });

  it("calls the uat lollipopLambdaClient checkWithGet when method is GET and isTest is true", async () => {
    await expect(
      lollipopCheckUseCase.execute(
        true,
        "GET",
        aLollipopLambdaHeaders,
        aLollipopLambdaQuery,
      ),
    ).resolves.toBe(aLollipopLambdaSuccessResponse);

    expect(uatLollipopLambdaClient.checkWithGet).toHaveBeenCalledOnce();
    expect(uatLollipopLambdaClient.checkWithGet).toHaveBeenCalledWith(
      aLollipopLambdaHeaders,
      aLollipopLambdaQuery,
    );
    expect(uatLollipopLambdaClient.checkWithPost).not.toHaveBeenCalled();
    expect(lollipopLambdaClient.checkWithGet).not.toHaveBeenCalled();
  });

  it("calls checkWithGet without query parameters when not provided", async () => {
    await expect(
      lollipopCheckUseCase.execute(false, "GET", aLollipopLambdaHeaders),
    ).resolves.toBe(aLollipopLambdaSuccessResponse);

    expect(lollipopLambdaClient.checkWithGet).toHaveBeenCalledOnce();
    expect(lollipopLambdaClient.checkWithGet).toHaveBeenCalledWith(
      aLollipopLambdaHeaders,
      undefined,
    );
  });
});

describe("LambdaLollipopCheckUseCase with POST method", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the prod lollipopLambdaClient checkWithPost when method is POST and isTest is false", async () => {
    await expect(
      lollipopCheckUseCase.execute(
        false,
        "POST",
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
    expect(uatLollipopLambdaClient.checkWithPost).not.toHaveBeenCalled();
  });

  it("calls the uat lollipopLambdaClient checkWithPost when method is POST and isTest is true", async () => {
    await expect(
      lollipopCheckUseCase.execute(
        true,
        "POST",
        aLollipopLambdaHeaders,
        aLollipopLambdaQuery,
        aLollipopLambdaRequestBody,
      ),
    ).resolves.toBe(aLollipopLambdaSuccessResponse);

    expect(uatLollipopLambdaClient.checkWithPost).toHaveBeenCalledOnce();
    expect(uatLollipopLambdaClient.checkWithPost).toHaveBeenCalledWith(
      aLollipopLambdaHeaders,
      aLollipopLambdaQuery,
      aLollipopLambdaRequestBody,
    );
    expect(uatLollipopLambdaClient.checkWithGet).not.toHaveBeenCalled();
    expect(lollipopLambdaClient.checkWithPost).not.toHaveBeenCalled();
  });

  it("calls checkWithPost without query and body when not provided", async () => {
    await expect(
      lollipopCheckUseCase.execute(false, "POST", aLollipopLambdaHeaders),
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
      lollipopCheckUseCase.execute(
        false,
        "POST",
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
