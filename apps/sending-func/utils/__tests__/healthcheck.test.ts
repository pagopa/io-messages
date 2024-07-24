import { BlobService, ErrorOrResult, ServiceResponse } from "azure-storage";

import { envConfig } from "../../__mocks__/env-config.mock";

import * as config from "../config";

import {
  checkApplicationHealth,
  checkAzureStorageHealth,
  checkAzureCosmosDbHealth,
  checkUrlHealth
} from "../healthcheck";

import { pipe } from "fp-ts/lib/function";

import * as TE from "fp-ts/lib/TaskEither";
import { isRight, isLeft, right } from "fp-ts/lib/Either";

const azure_storage = require("azure-storage");

const blobServiceOk: BlobService = ({
  getServiceProperties: jest
    .fn()
    .mockImplementation((callback: ErrorOrResult<any>) =>
      callback(
        (null as unknown) as Error,
        "ok",
        (null as unknown) as ServiceResponse
      )
    )
} as unknown) as BlobService;

const getBlobServiceKO = (name: string) =>
  (({
    getServiceProperties: jest
      .fn()
      .mockImplementation((callback: ErrorOrResult<any>) =>
        callback(
          Error(`error - ${name}`),
          null,
          (null as unknown) as ServiceResponse
        )
      )
  } as unknown) as BlobService);

const azureStorageMocks = {
  createBlobService: jest.fn(_ => blobServiceOk),
  createFileService: jest.fn(_ => blobServiceOk),
  createQueueService: jest.fn(_ => blobServiceOk),
  createTableService: jest.fn(_ => blobServiceOk)
};

function mockAzureStorageFunctions() {
  azure_storage["createBlobService"] = azureStorageMocks["createBlobService"];
  azure_storage["createFileService"] = azureStorageMocks["createFileService"];
  azure_storage["createQueueService"] = azureStorageMocks["createQueueService"];
  azure_storage["createTableService"] = azureStorageMocks["createTableService"];
}

// Cosmos DB mock

const mockGetDatabaseAccountOk = async () => {};
const mockGetDatabaseAccountKO = async () => {
  throw Error("Error calling Cosmos Db");
};

const mockGetDatabaseAccount = jest
  .fn()
  .mockImplementation(mockGetDatabaseAccountOk);

const cosmosdbClient = {
  getDatabaseAccount: mockGetDatabaseAccount
} as any;

// -------------
// TESTS
// -------------

describe("healthcheck - storage account", () => {
  beforeAll(() => {
    jest.clearAllMocks();
    mockAzureStorageFunctions();
  });

  it("should not throw exception", async () => {
    const res = await checkAzureStorageHealth("")();
    expect(isRight(res)).toBe(true);
  });

  const testcases: {
    name: keyof typeof azureStorageMocks;
  }[] = [
    {
      name: "createBlobService"
    },
    {
      name: "createFileService"
    },
    {
      name: "createQueueService"
    },
    {
      name: "createTableService"
    }
  ];
  test.each(testcases)("should throw exception %s", async ({ name }) => {
    const blobServiceKO = getBlobServiceKO(name);
    azureStorageMocks[name].mockReturnValueOnce(blobServiceKO);
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
    jest.clearAllMocks();
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
    jest.clearAllMocks();
  });

  it("should return an error if Url check fails", async () => {
    const res = await checkUrlHealth("")();
    expect(isLeft(res)).toBe(true);
  });
});

describe("checkApplicationHealth - multiple errors - ", () => {
  beforeAll(() => {
    jest.clearAllMocks();
    jest
      .spyOn(config, "getConfig")
      .mockReturnValue(right(envConfig as config.IConfig));

    mockAzureStorageFunctions();
  });

  it("should return multiple errors from different checks", async () => {
    const blobServiceKO = getBlobServiceKO("createBlobService");
    const queueServiceKO = getBlobServiceKO("createQueueService");
    azureStorageMocks["createBlobService"].mockReturnValueOnce(blobServiceKO);
    azureStorageMocks["createQueueService"].mockReturnValueOnce(queueServiceKO);

    const res = await checkApplicationHealth(cosmosdbClient)();
    expect(isLeft(res)).toBe(true);
    if (isLeft(res)) {
      const err = res.left;
      expect(err.length).toBe(2);
      expect(err[0]).toBe(`AzureStorage|error - createBlobService`);
      expect(err[1]).toBe(`AzureStorage|error - createQueueService`);
    }
  });
});
