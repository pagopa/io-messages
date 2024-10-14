import * as z from "zod";

export class ContentNotFoundError extends Error {
  constructor(message: string) {
    super();
    this.name = "Blob not found";
    this.message = message;
  }
}

export type GetBlobByNameErrors = ContentNotFoundError | Error | z.ZodError;
