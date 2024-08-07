import * as z from "zod";

import {
  CosmosClient,
  Database,
  Container,
  ItemResponse,
  ItemDefinition,
  StatusCode,
} from "@azure/cosmos";

interface CosmosMetadata {
  _rid: string;
  _self: string;
  _etag: string;
  _attachments: string;
  _ts: number;
}

export class CosmosError extends Error {
  private statusCode: StatusCode;

  constructor(statusCode: StatusCode, errorMessage: string) {
    super(errorMessage);
    this.statusCode = statusCode;
  }

  public getStatusCode(): StatusCode {
    return this.statusCode;
  }
}

export const unknownToCosmosError = (
  unknownError: unknown,
  errorMessage = `Something went wrong | ${unknownError}`,
): CosmosError => {
  if (unknownError instanceof Error) {
    if (
      "statusCode" in unknownError &&
      typeof unknownError.statusCode === "number"
    )
      return new CosmosError(unknownError.statusCode, unknownError.message);
    return new CosmosError(500, unknownError.message);
  } else {
    return new CosmosError(500, errorMessage);
  }
};

export class CosmosDB {
  private cosmosClient: CosmosClient;
  private database: Database;

  constructor(endpoint: string, key: string, databaseName: string) {
    this.cosmosClient = new CosmosClient({ endpoint, key });
    this.database = this.cosmosClient.database(databaseName);
  }

  public getDatabase(): Database {
    return this.database;
  }
}

export class CosmosContainer<
  NewItem extends ItemDefinition,
  RetrievedItem extends NewItem,
> {
  private container: Container;
  private decoder: (
    data: unknown,
    params?: Partial<z.ParseParams> | undefined,
  ) => Promise<RetrievedItem>;

  constructor(
    cosmosDb: CosmosDB,
    containerName: string,
    decoder: (
      data: unknown,
      params?: Partial<z.ParseParams> | undefined,
    ) => Promise<RetrievedItem>,
  ) {
    this.container = cosmosDb.getDatabase().container(containerName);
    this.decoder = decoder;
  }

  public async create(item: NewItem): Promise<Error | ItemResponse<NewItem>> {
    try {
      await this.decoder(item);
      return await this.container.items.create(item);
    } catch (error) {
      return error instanceof z.ZodError
        ? new Error("Error decoding the input item")
        : unknownToCosmosError(error);
    }
  }

  public async read(
    modelId: string,
    partitionKey?: string,
  ): Promise<CosmosError | ItemResponse<NewItem & CosmosMetadata>> {
    try {
      return await this.container.item(modelId, partitionKey).read();
    } catch (error) {
      return unknownToCosmosError(error);
    }
  }
}
