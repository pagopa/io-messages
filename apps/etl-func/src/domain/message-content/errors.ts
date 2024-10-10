import * as z from "zod";
export class BlobNotFoundError extends Error {
  constructor(message: string) {
    super();
    this.name = "Blob not found";
    this.message = message;
  }
}

export type GetBlobByNameErrors = BlobNotFoundError | z.ZodError | Error;
