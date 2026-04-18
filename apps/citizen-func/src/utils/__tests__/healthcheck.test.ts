import { CosmosClient } from "@azure/cosmos";
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

const storageMocks = vi.hoisted(() => ({
  getBlobProperties: vi.fn().mockResolvedValue({}),
  getQueueProperties: vi.fn().mockResolvedValue({}),
}));

vi.mock("@azure/storage-blob", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@azure/storage-blob")>();
  return {
    ...actual,
    BlobServiceClient: {
      fromConnectionString: vi.fn(() => ({
        getProperties: storageMocks.getBlobProperties,
      })),
    },
  };
});

vi.mock("@azure/storage-queue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@azure/storage-queue")>();
  return {
    ...actual,
    QueueServiceClient: {
      fromConnectionString: vi.fn(() => ({
        getProperties: storageMocks.getQueueProperties,
      })),
    },
  };
});

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
    errorLabel: string;
    name: keyof typeof storageMocks;
  }[] = [
    {
      errorLabel: "blob storage",
      name: "getBlobProperties",
    },
    {
      errorLabel: "queue storage",
      name: "getQueueProperties",
    },
  ];
  test.each(testcases)(
    "should throw exception $name",
    ({ errorLabel, name }) =>
      new Promise((done) => {
        storageMocks[name].mockRejectedValueOnce(
          new Error(`error - ${errorLabel}`),
        );

        expect.assertions(2);

        pipe(
          "",
          checkAzureStorageHealth,
          TE.mapLeft((err) => {
            expect(err.length).toBe(1);
            expect(err[0]).toBe(`AzureStorage|error - ${errorLabel}`);
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
      storageMocks.getBlobProperties.mockRejectedValueOnce(
        new Error("error - blob storage"),
      );
      storageMocks.getQueueProperties.mockRejectedValueOnce(
        new Error("error - queue storage"),
      );

      expect.assertions(3);

      pipe(
        checkApplicationHealth(cosmosClient, cosmosClient),
        TE.mapLeft((err) => {
          expect(err.length).toBe(2);
          expect(err[0]).toBe(`AzureStorage|error - blob storage`);
          expect(err[1]).toBe(`AzureStorage|error - queue storage`);
          done();
        }),
        TE.map(() => {
          expect(true).toBeFalsy();
          done();
        }),
      )();
    }));
});
