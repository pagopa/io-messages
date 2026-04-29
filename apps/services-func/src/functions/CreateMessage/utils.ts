import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { upsertBlobFromObject } from "io-messages-common-legacy/adapters/utils";

export const makeUpsertBlobFromObject =
  (
    blobService: Parameters<typeof upsertBlobFromObject>[0],
    containerName: Parameters<typeof upsertBlobFromObject>[1],
    options: Parameters<typeof upsertBlobFromObject>[4] = {},
  ) =>
  <T>(
    blobName: string,
    content: T,
  ): TE.TaskEither<Error, Awaited<ReturnType<typeof upsertBlobFromObject>>> =>
    pipe(
      TE.tryCatch(
        () =>
          upsertBlobFromObject(
            blobService,
            containerName,
            blobName,
            content,
            options,
          ),
        E.toError,
      ),
    );
