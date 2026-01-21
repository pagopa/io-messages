import { readFile } from "fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { infoHandler } from "../info.js";

vi.mock("fs/promises");

const readFileMock = vi.mocked(readFile);

const aPackageJsonContent = JSON.stringify({
  name: "send-func",
  version: "1.5.1",
});

describe("Info", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 status code with name and version when package.json is read successfully", async () => {
    readFileMock.mockResolvedValueOnce(aPackageJsonContent);

    await expect(infoHandler()).resolves.toEqual({
      body: JSON.stringify({
        name: "send-func",
        version: "1.5.1",
      }),
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

    expect(readFileMock).toHaveBeenCalledWith(
      expect.stringContaining("package.json"),
      "utf-8",
    );
  });

  it("returns 500 status code when package.json cannot be read", async () => {
    readFileMock.mockRejectedValueOnce(new Error("File not found"));

    await expect(infoHandler()).resolves.toEqual({
      body: JSON.stringify({ error: "Could not read function info" }),
      status: 500,
    });

    expect(readFileMock).toHaveBeenCalledWith(
      expect.stringContaining("package.json"),
      "utf-8",
    );
  });
});
