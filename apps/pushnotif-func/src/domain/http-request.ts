// TODO: move this file to io-messages-common
import { HttpRequest, HttpResponse } from "@azure/functions";
import z from "zod";

import { ErrorValidation } from "./error";

export const parseHttpRequestBody = async <T extends z.ZodTypeAny>(
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

export const createHttpResponse = (
  status: number,
  body: unknown,
): HttpResponse =>
  new HttpResponse({
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    status,
  });
