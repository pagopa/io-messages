import { upsertBlobFromObject as upsertBlobFromObjectBase } from "@pagopa/io-functions-commons/dist/src/utils/azure_storage";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

// just a trick to keep upsertBlobFromObject in sync with upsertBlobFromObject
//  by extracting its left and right types
type UpsertReturnType =
  ReturnType<typeof upsertBlobFromObjectBase> extends Promise<
    E.Either<infer L, infer R>
  >
    ? TE.TaskEither<L, R>
    : never;

export const makeUpsertBlobFromObject =
  (
    blobService: Parameters<typeof upsertBlobFromObjectBase>[0],
    containerName: Parameters<typeof upsertBlobFromObjectBase>[1],
    options: Parameters<typeof upsertBlobFromObjectBase>[4] = {},
  ) =>
  <T>(blobName: string, content: T): UpsertReturnType =>
    pipe(
      TE.tryCatch(
        () =>
          upsertBlobFromObjectBase(
            blobService,
            containerName,
            blobName,
            content,
            options,
          ),
        E.toError,
      ),
      TE.chain(TE.fromEither),
    );
