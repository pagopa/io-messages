import type { Container } from "@azure/cosmos";

import {
  RetrievedService,
  type RetrievedService as RetrievedServiceType,
  type Service,
  ServiceModel,
} from "@pagopa/io-functions-commons/dist/src/models/service";
import {
  CosmosDecodingError,
  type CosmosErrors,
  type DocumentSearchKey,
  toCosmosErrorResponse,
} from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

class EmulatorCompatibleServiceModel extends ServiceModel {
  override findLastVersionByModelId(
    searchKey: DocumentSearchKey<Service, "serviceId">,
  ): TE.TaskEither<CosmosErrors, O.Option<RetrievedServiceType>> {
    const [serviceId] = searchKey;

    return pipe(
      TE.tryCatch(
        () =>
          this.container.items
            .query(
              {
                parameters: [{ name: "@serviceId", value: serviceId }],
                query:
                  "SELECT TOP 1 * FROM m WHERE m.serviceId = @serviceId ORDER BY m.version DESC",
              },
              {
                maxItemCount: 1,
                partitionKey: serviceId,
              },
            )
            .fetchAll(),
        toCosmosErrorResponse,
      ),
      TE.map(({ resources }) => resources[0]),
      TE.chainW((resource) =>
        resource === undefined
          ? TE.of(O.none)
          : pipe(
              { _self: "", ...resource },
              RetrievedService.decode,
              E.map(O.some),
              TE.fromEither,
              TE.mapLeft(CosmosDecodingError),
            ),
      ),
    );
  }
}

export const createServiceModel = (container: Container): ServiceModel =>
  process.env.COSMOSDB_EMULATOR_ALLOW_MISSING_SELF === "true"
    ? new EmulatorCompatibleServiceModel(container)
    : new ServiceModel(container);
