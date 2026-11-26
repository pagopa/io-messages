import type { HttpRequestMiddleware } from "@pagopa/hexagonal-core";

import {
  ForbiddenError,
  GenericError,
  NotFoundError,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";

import type { ServicesCmsRepository } from "../../../../application/ports/services-cms.js";

export interface ServiceContext {
  service: {
    authorizedCidrs: readonly string[];
    id: string;
  };
}

export const makeServiceResolutionMiddleware =
  (
    servicesCmsRepository: ServicesCmsRepository,
  ): HttpRequestMiddleware<
    { subscriptionId: string },
    ServiceContext,
    ForbiddenError | GenericError
  > =>
  async ({ context }) => {
    const result = await servicesCmsRepository.getServiceCmsDetails(
      context.subscriptionId,
    );
    if (result.isErr()) {
      return err(
        result.error instanceof NotFoundError
          ? new ForbiddenError()
          : new GenericError(result.error.message),
      );
    }

    return ok({
      service: {
        authorizedCidrs: result.value.authorized_cidrs,
        id: result.value.id,
      },
    });
  };
