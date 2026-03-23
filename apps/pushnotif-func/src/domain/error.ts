// TODO: move this file to io-messages-common

export class ErrorValidation extends Error {
  cause: unknown;
  code = "400";

  constructor(name: string, cause: unknown = "") {
    super(name);
    this.cause = cause;
  }
}

export class ErrorNotFound extends Error {
  cause: unknown;
  code = "404";

  constructor(name: string, cause: unknown = "") {
    super(name);
    this.cause = cause;
  }
}

export class ErrorTooManyRequests extends Error {
  cause: unknown;
  code = "429";

  constructor(name: string, cause: unknown = "") {
    super(name);
    this.cause = cause;
  }
}

export class ErrorInternal extends Error {
  cause: unknown;
  code = "500";

  constructor(name: string, cause: unknown = "") {
    super(name);
    this.cause = cause;
  }
}
