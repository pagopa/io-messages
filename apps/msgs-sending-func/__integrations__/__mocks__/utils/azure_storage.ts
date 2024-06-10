import { QueueServiceClient } from "@azure/storage-queue";
import { flow, pipe } from "fp-ts/lib/function";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import * as T from "fp-ts/lib/Task";
import { ContainerClient } from "@azure/storage-blob";

export const createBlobs = (
  blobContainerClient: ContainerClient
) =>
  pipe(
    TE.tryCatch(
      async () => blobContainerClient.createIfNotExists(),
      E.toError
    ) 
  );

export const createQueues = (
  queueServiceClient: QueueServiceClient,
  queues: string[]
) =>
  pipe(
    queues,
    T.of,
    T.chain(
      flow(
        RA.map(q =>
          TE.tryCatch(async () => queueServiceClient.createQueue(q), E.toError)
        ),
        RA.sequence(T.ApplicativeSeq)
      )
    )
  );
