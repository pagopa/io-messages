import { GenericError } from "@pagopa/hexagonal-core";
import { mkdtempDisposable, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import { PackageJsonAppInfoReader } from "../package-json-app-info-reader.js";

const tempDir = () =>
  mkdtempDisposable(join(tmpdir(), "messages-func-app-info-"));

describe("PackageJsonAppInfoReader", () => {
  it("reads only the name and version of the supplied package.json", async () => {
    await using directory = await tempDir();
    const manifest = pathToFileURL(join(directory.path, "package.json"));
    const metadata = { name: "messages-func", version: "1.2.3" };
    await writeFile(manifest, JSON.stringify({ ...metadata, private: true }));

    const result = await new PackageJsonAppInfoReader(manifest).getAppInfo();

    expect(result._unsafeUnwrap()).toEqual(metadata);
  });

  it("returns an error when the manifest cannot be read", async () => {
    await using directory = await tempDir();
    const manifest = pathToFileURL(join(directory.path, "package.json"));

    const result = await new PackageJsonAppInfoReader(manifest).getAppInfo();

    expect(result._unsafeUnwrapErr()).toEqual(
      new GenericError("Unable to read application package.json"),
    );
  });

  it.each([
    [
      "invalid JSON",
      '{"internal":broken',
      "Application package.json is not valid JSON",
    ],
    [
      "a missing name",
      '{"version":"1.2.3"}',
      "Invalid app metadata in package.json",
    ],
    [
      "an empty version",
      '{"name":"messages-func","version":""}',
      "Invalid app metadata in package.json",
    ],
    [
      "a blank name",
      '{"name":" ","version":"1.2.3"}',
      "Invalid app metadata in package.json",
    ],
    [
      "a numeric version",
      '{"name":"messages-func","version":123}',
      "Invalid app metadata in package.json",
    ],
  ])("returns an error for %s", async (_scenario, contents, errorMessage) => {
    await using directory = await tempDir();
    const manifest = pathToFileURL(join(directory.path, "package.json"));
    await writeFile(manifest, contents);

    const result = await new PackageJsonAppInfoReader(manifest).getAppInfo();

    expect(result._unsafeUnwrapErr()).toEqual(new GenericError(errorMessage));
  });
});
