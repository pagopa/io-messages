import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import { GenericError } from "@pagopa/hexagonal-core";
import { Result, ok } from "neverthrow";

import { AppHealthchecker } from "../../../application/ports/app-healthcheck.js";

export class LoggerHealthcheckAdapter implements AppHealthchecker {
  constructor(
    private logger: Logger,
    private name?: string,
  ) {}

  async health(): Promise<Result<void, GenericError>> {
    this.logger.trackEvent({
      name: "LoggerHealthcheckAdapter.health",
      properties: {
        message: `test ${this.name} healthcheck`,
      },
    });
    return ok(undefined);
  }
}
