import { InvocationContext, RetryContext } from "@azure/functions";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { ActivityLogger, createLogger } from "./log";
import {
  ActivityResultFailure,
  ActivityResultSuccess,
  failActivity,
} from "./return-types";

export { createLogger } from "./log";
export * from "./return-types";

export type ActivityBody<
  Input = unknown,
  Success extends ActivityResultSuccess = ActivityResultSuccess,
  Failure extends ActivityResultFailure = ActivityResultFailure,
> = (p: {
  readonly input: Input;
  readonly logger: ActivityLogger;
  readonly retryContext?: RetryContext;
}) => TE.TaskEither<Failure, Success>;

// All activity will return ActivityResultFailure, ActivityResultSuccess or some derived types
type ActivityResult<R extends ActivityResultFailure | ActivityResultSuccess> =
  | ActivityResultFailure
  | ActivityResultSuccess
  | R;

/**
 * Wraps an activity execution so that types are enforced and errors are handled consistently.
 * The purpose is to reduce boilerplate in activity implementation and let developers define only what it matters in terms of business logic
 *
 * @param activityName name of the activity (as it's defined in the Azure Runtime)
 * @param InputCodec an io-ts codec which maps the expected input structure
 * @param body the activity logic implementation
 * @param OutputCodec an io-ts codec which maps the expected output structure
 * @returns an activity handler compatible with durable-functions v3 (input, context)
 */
export const createActivity =
  <
    I = unknown,
    S extends ActivityResultSuccess = ActivityResultSuccess,
    F extends ActivityResultFailure = ActivityResultFailure,
  >(
    activityName: string,
    InputCodec: t.Type<I>,
    OutputCodec: t.Type<S>,
    body: ActivityBody<I, S, F>,
  ) =>
  async (
    rawInput: unknown,
    context: InvocationContext,
  ): Promise<ActivityResult<F | S>> => {
    const logger = createLogger(context, activityName);

    return pipe(
      rawInput,
      InputCodec.decode,
      TE.fromEither,
      TE.mapLeft(
        (err) =>
          failActivity(logger)(
            "Error decoding activity input",
            readableReport(err),
          ) as F,
      ),
      TE.chain((input) =>
        body({ input, logger, retryContext: context.retryContext }),
      ),
      TE.map((e) => OutputCodec.encode(e)),
      TE.toUnion,
    )();
  };
