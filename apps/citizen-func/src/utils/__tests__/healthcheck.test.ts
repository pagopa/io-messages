import { CosmosClient } from "@azure/cosmos";
import { BlobService, ErrorOrResult, ServiceResponse } from "azure-storage";
import { right } from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { beforeAll, describe, expect, it, test, vi } from "vitest";

import { envConfig } from "../../__mocks__/env-config.mock";
import * as config from "../config";
import {
  checkApplicationHealth,
  checkAzureCosmosDbHealth,
  checkAzureStorageHealth,
} from "../healthcheck";

vi.spyOn(config, "getConfig").mockReturnValue(right(envConfig));

const blobServiceOk: BlobService = {
  getServiceProperties: vi
    .fn()
    .mockImplementation((callback: ErrorOrResult<"ok">) =>
      callback(
        null as unknown as Error,
        "ok",
        null as unknown as ServiceResponse,
      ),
    ),
} as unknown as BlobService;

const storageMocks = vi.hoisted(() => ({
  createBlobService: vi.fn(() => blobServiceOk),
  createQueueService: vi.fn(() => blobServiceOk),
}));

vi.mock("azure-storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("azure-storage")>();
  return {
    ...actual,
    createBlobService: storageMocks.createBlobService,
    createQueueService: storageMocks.createQueueService,
  };
});

const getBlobServiceKO = (name: string) =>
  ({
    getServiceProperties: vi
      .fn()
      .mockImplementation((callback: ErrorOrResult<null>) =>
        callback(
          Error(`error - ${name}`),
          null,
          null as unknown as ServiceResponse,
        ),
      ),
  }) as unknown as BlobService;

// Cosmos DB mock

const mockGetDatabaseAccountOk = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
);

const mockGetDatabaseAccountKO = vi.hoisted(() =>
  vi.fn().mockRejectedValue(new Error("Error calling Cosmos Db")),
);

const mockGetDatabaseAccount = vi.hoisted(() => mockGetDatabaseAccountOk);

vi.mock("@azure/cosmos", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@azure/cosmos")>();
  return {
    ...actual,
    CosmosClient: vi.fn().mockReturnValue({
      getDatabaseAccount: mockGetDatabaseAccount,
    }),
  };
});

const cosmosClient = new CosmosClient({
  endpoint: "test-endoint",
});

// -------------
// TESTS
// -------------

describe("healthcheck - storage account", () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  it("should not throw exception", () =>
    new Promise<void>((done) => {
      expect.assertions(1);
      pipe(
        "",
        checkAzureStorageHealth,
        TE.map(() => {
          expect(true).toBeTruthy();
          done();
        }),
      )();
    }));

  const testcases: {
    name: keyof typeof storageMocks;
  }[] = [
    {
      name: "createBlobService",
    },
    {
      name: "createQueueService",
    },
  ];
  test.each(testcases)(
    "should throw exception %s",
    ({ name }) =>
      new Promise((done) => {
        const blobServiceKO = getBlobServiceKO(name);
        storageMocks[name].mockReturnValueOnce(blobServiceKO);

        expect.assertions(2);

        pipe(
          "",
          checkAzureStorageHealth,
          TE.mapLeft((err) => {
            expect(err.length).toBe(1);
            expect(err[0]).toBe(`AzureStorage|error - ${name}`);
            done();
          }),
          TE.map(() => {
            expect(true).toBeFalsy();
            done();
          }),
        )();
      }),
  );
});

describe("healthcheck - cosmos db", () => {
  beforeAll(() => {
    //vi.clearAllMocks();
  });

  it("should return no error", () =>
    new Promise<void>((done) => {
      expect.assertions(1);

      pipe(
        checkAzureCosmosDbHealth(cosmosClient),
        TE.map(() => {
          expect(true).toBeTruthy();
          done();
        }),
        TE.mapLeft(() => {
          expect(true).toBeFalsy();
          done();
        }),
      )();
    }));

  it("should return an error if CosmosClient fails", () =>
    new Promise<void>((done) => {
      expect.assertions(1);

      mockGetDatabaseAccount.mockImplementationOnce(mockGetDatabaseAccountKO);

      pipe(
        checkAzureCosmosDbHealth(cosmosClient),
        TE.map(() => {
          expect(false).toBeTruthy();
          done();
        }),
        TE.mapLeft(() => {
          expect(true).toBeTruthy();
          done();
        }),
      )();
    }));
});

describe("healthcheck - url health", () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  // todo
  it("should return no error", () => {
    expect(true).toBeTruthy();
  });
});

describe("checkApplicationHealth - multiple errors -", () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  it("should return multiple errors from different checks", () =>
    new Promise<void>((done) => {
      const blobServiceKO = getBlobServiceKO("createBlobService");
      const queueServiceKO = getBlobServiceKO("createQueueService");
      storageMocks["createBlobService"].mockReturnValueOnce(blobServiceKO);
      storageMocks["createQueueService"].mockReturnValueOnce(queueServiceKO);

      expect.assertions(3);

      pipe(
        checkApplicationHealth(cosmosClient, cosmosClient),
        TE.mapLeft((err) => {
          expect(err.length).toBe(2);
          expect(err[0]).toBe(`AzureStorage|error - createBlobService`);
          expect(err[1]).toBe(`AzureStorage|error - createQueueService`);
          done();
        }),
        TE.map(() => {
          expect(true).toBeFalsy();
          done();
        }),
      )();
    }));
});
