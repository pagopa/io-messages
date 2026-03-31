// TODO: move this file to io-messages-common

import { HttpRequest } from "@azure/functions";
import { ZodObject } from "zod/v4/classic/external.cjs";

import { ErrorValidation } from "./error";

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseRequestBody = async <T extends ZodObject<any>>(
  request: HttpRequest,
  schema: T,
): Promise<ErrorValidation | T["_output"]> => {
  try {
    const body = await request.json();

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return new ErrorValidation(
        "Invalid request body",
        "",
        parsed.error.issues,
      );
    }

    return parsed.data;
  } catch {
    return new ErrorValidation("Invalid JSON body");
  }
};
