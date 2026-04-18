import { CosmosClient } from "@azure/cosmos";
import { isLeft, isRight, right } from "fp-ts/lib/Either";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { envConfig } from "../../__mocks__/env-config.mock";
import * as config from "../config";
import {
  checkApplicationHealth,
  checkAzureCosmosDbHealth,
  checkUrlHealth,
} from "../healthcheck";

// Cosmos DB mock

const mockGetDatabaseAccountOk = async () => {};
const mockGetDatabaseAccountKO = async () => {
  throw Error("Error calling Cosmos Db");
};

const mockGetDatabaseAccount = vi
  .fn()
  .mockImplementation(mockGetDatabaseAccountOk);

const cosmosdbClient = {
  getDatabaseAccount: mockGetDatabaseAccount,
} as unknown as CosmosClient;

// -------------
// TESTS
// -------------

describe("healthcheck - cosmos db", () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  it("should return no error", async () => {
    const res = await checkAzureCosmosDbHealth(cosmosdbClient)();
    expect(isRight(res)).toBe(true);
  });

  it("should return an error if CosmosClient fails", async () => {
    mockGetDatabaseAccount.mockImplementationOnce(mockGetDatabaseAccountKO);
    const res = await checkAzureCosmosDbHealth(cosmosdbClient)();
    expect(isLeft(res)).toBe(true);
  });
});

describe("healthcheck - url health", () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  it("should return an error if Url check fails", async () => {
    const res = await checkUrlHealth("")();
    expect(isLeft(res)).toBe(true);
  });
});

describe("checkApplicationHealth", () => {
  beforeAll(() => {
    vi.clearAllMocks();
    vi.spyOn(config, "getConfig").mockReturnValue(
      right(envConfig as config.IConfig),
    );
  });

  it("should not return errors", async () => {
    const res = await checkApplicationHealth(cosmosdbClient, cosmosdbClient)();
    expect(isLeft(res)).toBe(false);
  });
});
