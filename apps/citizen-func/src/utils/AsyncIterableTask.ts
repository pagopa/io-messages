import {
  IPage,
  asyncIterableToPageArray,
  mapAsyncIterator,
} from "@pagopa/io-functions-commons/dist/src/utils/async";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

/**
 * @category model
 * @since 2.0.0
 */
export type AsyncIterableTask<A> = T.Task<AsyncIterable<A>>;

/**
 * Maps over an AsyncIterable
 */
const mapAsyncIterable2 = <T, V>(
  source: AsyncIterable<T>,
  f: (t: T) => Promise<V> | V,
): AsyncIterable<V> => {
  const iter = source[Symbol.asyncIterator]();
  const iterMapped = mapAsyncIterator(iter, f);
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [Symbol.asyncIterator]: (): AsyncIterator<V, any, undefined> => iterMapped,
  };
};

/**
 * `map` can be used to turn functions `(a: A) => B` into functions `(fa: F<A>) => F<B>` whose argument and return types
 * use the type constructor `F` to represent some computational context.
 *
 * @category Functor
 */
export const map: <A, B>(
  f: (a: A) => B | Promise<B>,
) => // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
(fa: AsyncIterableTask<A>) => AsyncIterableTask<B> = (f) => (fa) =>
  pipe(
    fa,
    T.map((_) => mapAsyncIterable2(_, f)),
  );

export const mapIterable =
  <A, B>(f: (a: AsyncIterable<A>) => AsyncIterable<B>) =>
  (fa: AsyncIterableTask<A>): AsyncIterableTask<B> =>
    pipe(fa, T.map(f));

export const fromAsyncIterable = <A>(
  a: AsyncIterable<A>,
): AsyncIterableTask<A> => T.of(a);

export const fromAsyncIterator = <A>(
  a: AsyncIterator<A>,
): AsyncIterableTask<A> =>
  fromAsyncIterable({
    [Symbol.asyncIterator]: () => a,
  });

/**
 * Process an AsyncIterableTask and return an array of results
 */
export const fold = <A>(fa: AsyncIterableTask<A>): T.Task<readonly A[]> =>
  pipe(
    fa,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define, @typescript-eslint/explicit-function-return-type
    T.chain((_) => foldIterableArray<A>(_)),
  );

/**
 * Process an AsyncIterableTask that can fail and return either an error or an array of results
 */
export const foldTaskEither =
  <E, A>(onError: (err: unknown) => E) =>
  (fa: AsyncIterableTask<A>): TE.TaskEither<E, readonly A[]> =>
    pipe(
      fa,
      TE.fromTask,
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      TE.chain((_) => TE.tryCatch(() => foldIterableArray<A>(_)(), onError)),
    );

/**
 * Loop through the AsyncIterable collection and return all results
 *
 * @param asyncIterable the iterable to be read
 * @returns a readonly array of all values collected from the iterable
 */
const foldIterableArray =
  <A>(asyncIterable: AsyncIterable<A>) =>
  async (): Promise<readonly A[]> => {
    const array: A[] = [];
    for await (const variable of asyncIterable) {
      array.push(variable);
    }
    return array;
  };

export const run = <A>(fa: AsyncIterableTask<A>): T.Task<void> =>
  pipe(
    fa,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    T.chain((asyncIterable) => async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of asyncIterable) {
        // nothing to do: this is done to resolve the async iterator
      }
    }),
  );

/**
 * Process an AsyncIterableTask that can fail and return either an error or an array of results
 */
export const reduceTaskEither =
  <E, A, B>(
    onError: (err: unknown) => E,
    initialValue: B,
    reducer: (prev: B, curr: A) => B | Promise<B>,
  ) =>
  (fa: AsyncIterableTask<A>): TE.TaskEither<E, B> =>
    pipe(
      fa,
      TE.fromTask,
      TE.chain((_) =>
        TE.tryCatch(
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          reduceIterableArray(initialValue, reducer)(_),
          onError,
        ),
      ),
    );

/**
 * Loop through the AsyncIterable collection and reduce it
 *
 */
const reduceIterableArray =
  <A, B>(initialValue: B, reducer: (prev: B, curr: A) => B | Promise<B>) =>
  (asyncIterable: AsyncIterable<A>) =>
  async (): Promise<B> => {
    let p: B = initialValue;

    for await (const variable of asyncIterable) {
      p = await reducer(p, variable);
    }
    return p;
  };

/**
 * Return a TaskEither of a paged result or an Error
 */
export const toPageArray =
  <E, A>(onError: (err: unknown) => E, pageSize: NonNegativeInteger) =>
  (fa: AsyncIterableTask<A>): TE.TaskEither<E, IPage<A>> =>
    pipe(
      fa,
      TE.fromTask,
      TE.chain((_) =>
        TE.tryCatch(() => asyncIterableToPageArray(_, pageSize), onError),
      ),
    );
