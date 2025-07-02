import * as t from "io-ts";

/**
 * Create a decoder that parses a list of comma-separated elements into an array of typed items, using the provided decoder
 *
 * @param decoder a io-ts decoder
 * @returns either a decode error or the array of decoded items
 */
export const CommaSeparatedListOf = <A, O>(
  decoder: t.Type<A, O, unknown>,
): t.Type<readonly A[], string, unknown> =>
  new t.Type<readonly A[], string, unknown>(
    `CommaSeparatedListOf<${decoder.name}>`,
    (value: unknown): value is readonly A[] =>
      Array.isArray(value) && value.every((e) => decoder.is(e)),
    (input) =>
      t.readonlyArray(decoder).decode(
        typeof input === "string"
          ? input
              .split(",")
              .map((e) => e.trim())
              .filter(Boolean)
          : !input
            ? []
            : input,
      ),
    (a) => a.map((item) => decoder.encode(item)).join(","),
  );
