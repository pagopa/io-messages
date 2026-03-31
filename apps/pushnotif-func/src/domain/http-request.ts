// TODO: move this file to io-messages-common

import { HttpRequest } from "@azure/functions";

import { ErrorValidation } from "./error";

export const parseRequestBodyToJson = async (
  request: HttpRequest,
): Promise<ErrorValidation | unknown> => {
  try {
    return request.json();
  } catch {
    return new ErrorValidation("Invalid JSON body");
  }
};
