import { BlobService, ErrorOrResult, ServiceResponse } from "azure-storage";

import { envConfig } from "../../__mocks__/env-config.mock";

import * as config from "../config";

import { it, describe, expect, vi, beforeAll, test } from "vitest";

import {
  checkApplicationHealth,
  checkAzureStorageHealth,
  checkAzureCosmosDbHealth,
  checkUrlHealth,
} from "../healthcheck";

import { isRight, isLeft, right } from "fp-ts/lib/Either";

const blobServiceOk: BlobService = {
  getServiceProperties: vi
    .fn()
    .mockImplementation((callback: ErrorOrResult<any>) =>
      callback(
        null as unknown as Error,
        "ok",
        null as unknown as ServiceResponse,
      ),
    ),
} as unknown as BlobService;

const storageMocks = vi.hoisted(() => ({
  createBlobService: vi.fn((_) => blobServiceOk),
  createFileService: vi.fn((_) => blobServiceOk),
  createTableService: vi.fn((_) => blobServiceOk),
  createQueueService: vi.fn((_) => blobServiceOk),
}));

vi.mock("azure-storage", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createBlobService: storageMocks.createBlobService,
    createFileService: storageMocks.createFileService,
    createTableService: storageMocks.createTableService,
    createQueueService: storageMocks.createQueueService,
  };
});

const getBlobServiceKO = (name: string) =>
  ({
    getServiceProperties: vi
      .fn()
      .mockImplementation((callback: ErrorOrResult<any>) =>
        callback(
          Error(`error - ${name}`),
          null,
          null as unknown as ServiceResponse,
        ),
      ),
  }) as unknown as BlobService;

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
} as any;

// -------------
// TESTS
// -------------

describe("healthcheck - storage account", () => {
  beforeAll(() => {
    vi.clearAllMocks();
    //mockAzureStorageFunctions();
  });

  it("should not throw exception", async () => {
    const res = await checkAzureStorageHealth("")();
    expect(isRight(res)).toBe(true);
  });

  const testcases: {
    name: keyof typeof storageMocks;
  }[] = [
    {
      name: "createBlobService",
    },
    {
      name: "createFileService",
    },
    {
      name: "createQueueService",
    },
    {
      name: "createTableService",
    },
  ];
  test.each(testcases)("should throw exception %s", async ({ name }) => {
    const blobServiceKO = getBlobServiceKO(name);
    storageMocks[name].mockReturnValueOnce(blobServiceKO);

    const res = await checkAzureStorageHealth("")();
    expect(isLeft(res)).toBe(true);
    if (isLeft(res)) {
      const err = res.left;
      expect(err.length).toBe(1);
      expect(err[0]).toBe(`AzureStorage|error - ${name}`);
    }
  });
});

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

describe("checkApplicationHealth - multiple errors - ", () => {
  beforeAll(() => {
    vi.clearAllMocks();
    vi.spyOn(config, "getConfig").mockReturnValue(
      right(envConfig as config.IConfig),
    );

    //mockAzureStorageFunctions();
  });

  it("should return multiple errors from different checks", async () => {
    const blobServiceKO = getBlobServiceKO("createBlobService");
    const queueServiceKO = getBlobServiceKO("createQueueService");
    storageMocks.createBlobService.mockReturnValueOnce(blobServiceKO);
    storageMocks.createQueueService.mockReturnValueOnce(queueServiceKO);

    const res = await checkApplicationHealth(cosmosdbClient, cosmosdbClient)();
    expect(isLeft(res)).toBe(true);
    if (isLeft(res)) {
      const err = res.left;
      expect(err.length).toBe(2);
      expect(err[0]).toBe(`AzureStorage|error - createBlobService`);
      expect(err[1]).toBe(`AzureStorage|error - createQueueService`);
    }
  });
});
