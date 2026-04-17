import { Readable } from "stream";
import { describe, expect, test } from "vitest";

import { readableStreamToUtf8 } from "../utils";

const makeStream = (chunks: (Buffer | string)[]): NodeJS.ReadableStream => {
  const readable = new Readable({ read() {} });
  for (const chunk of chunks) {
    readable.push(chunk);
  }
  readable.push(null);
  return readable;
};

describe("readableStreamToUtf8", () => {
  test("resolves with the utf-8 content of a string stream", async () => {
    const stream = makeStream(["hello world"]);
    const result = await readableStreamToUtf8(stream);
    expect(result).toBe("hello world");
  });

  test("resolves with the utf-8 content of a buffer stream", async () => {
    const stream = makeStream([Buffer.from("hello world", "utf-8")]);
    const result = await readableStreamToUtf8(stream);
    expect(result).toBe("hello world");
  });

  test("resolves with an empty string for an empty stream", async () => {
    const stream = makeStream([]);
    const result = await readableStreamToUtf8(stream);
    expect(result).toBe("");
  });

  test("concatenates multiple chunks", async () => {
    const stream = makeStream(["foo", "bar", "baz"]);
    const result = await readableStreamToUtf8(stream);
    expect(result).toBe("foobarbaz");
  });

  test("handles mixed string and buffer chunks", async () => {
    const stream = makeStream(["hello ", Buffer.from("world", "utf-8")]);
    const result = await readableStreamToUtf8(stream);
    expect(result).toBe("hello world");
  });

  test("rejects when the stream emits an error", async () => {
    const readable = new Readable({ read() {} });
    const error = new Error("stream error");
    setImmediate(() => readable.destroy(error));
    await expect(readableStreamToUtf8(readable)).rejects.toThrow(
      "stream error",
    );
  });

  test("handles multi-byte utf-8 characters split across buffer and string chunks", async () => {
    const text = "ciao \u00e8 \u00e0";
    const stream = makeStream([Buffer.from(text, "utf-8")]);
    const result = await readableStreamToUtf8(stream);
    expect(result).toBe(text);
  });
});
