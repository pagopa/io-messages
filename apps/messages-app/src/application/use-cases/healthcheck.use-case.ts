import type { GenericError, UseCase } from "@pagopa/hexagonal-core";

import { ok } from "neverthrow";

import type {
  AppHealthcheck,
  AppHealthchecker,
} from "../ports/app-healthcheck.js";

export const makeHealthcheckUseCase =
  (
    healthchecks: AppHealthchecker[],
  ): UseCase<Record<string, never>, AppHealthcheck, GenericError> =>
  async () => {
    const healthCheckResults = await Promise.all(
      healthchecks.map((hc) => hc.health()),
    );

    const failures = healthCheckResults
      .filter((result) => result.isErr())
      .map((result) => result.error.message);

    return ok({ failures });
  };
