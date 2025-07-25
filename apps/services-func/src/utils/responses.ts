import { errorsToReadableMessages } from "@pagopa/ts-commons/lib/reporters";
import { IResponseType } from "@pagopa/ts-commons/lib/requests";
import {
  HttpStatusCodeEnum,
  IResponse,
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseErrorTooManyRequests,
  ResponseErrorForbiddenNotAuthorized,
  ResponseErrorGeneric,
  ResponseErrorInternal,
  ResponseErrorNotFound,
  ResponseErrorTooManyRequests,
} from "@pagopa/ts-commons/lib/responses";
import { toError } from "fp-ts/lib/Either";
import { Errors } from "io-ts";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const unhandledResponseStatus = (status: number) =>
  ResponseErrorInternal(`unhandled API response status [${status}]`);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const toDefaultResponseErrorInternal = (errs: Errors | unknown) =>
  ResponseErrorInternal(toError(errs).message);

/**
 * Interface for unauthorized error response.
 */
export interface IResponseErrorUnauthorized
  extends IResponse<"IResponseErrorUnauthorized"> {
  readonly detail: string;
}
/**
 * Returns an unauthorized error response with status code 401.
 */
export function ResponseErrorUnauthorized(
  title: string,
  detail: string,
): IResponseErrorUnauthorized {
  return {
    ...ResponseErrorGeneric(HttpStatusCodeEnum.HTTP_STATUS_401, title, detail),
    ...{
      detail: `${title}: ${detail}`,
      kind: "IResponseErrorUnauthorized",
    },
  };
}

export type ErrorResponses =
  | IResponseErrorForbiddenNotAuthorized
  | IResponseErrorInternal
  | IResponseErrorNotFound
  | IResponseErrorTooManyRequests
  | IResponseErrorUnauthorized;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const toErrorServerResponse = <S extends number, T>(
  response: IResponseType<S, T>,
) => {
  switch (response.status) {
    case 401:
      return ResponseErrorUnauthorized("Unauthorized", "Unauthorized");
    case 403:
      return ResponseErrorForbiddenNotAuthorized;
    case 404:
      return ResponseErrorNotFound("Not found", "Resource not found");
    case 429:
      return ResponseErrorTooManyRequests("Too many requests");
    default:
      return unhandledResponseStatus(response.status);
  }
};

export const errorsToError = (errors: Errors): Error =>
  new Error(errorsToReadableMessages(errors).join(" / "));
