// TODO: move this file to io-messages-common
export class ErrorNotFound extends Error {
  code = "404";
  cause: unknown;

  constructor(name: string, cause: unknown = "") {
    super(name);
    this.cause = cause;
  }
}

export class ErrorValidation extends Error {
  code = "400";
  cause: unknown;

  constructor(name: string, cause: unknown = "") {
    super(name);
    this.cause = cause;
  }
}
