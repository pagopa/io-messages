import { HttpResponseInit } from "@azure/functions";
import { readFile } from "fs/promises";
import { join } from "path";

export const infoHandler = async (): Promise<HttpResponseInit> => {
  try {
    const packageJsonPath = join(process.cwd(), "package.json");
    const pkgRaw = await readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(pkgRaw);
    return {
      body: JSON.stringify({
        name: pkg.name,
        version: pkg.version,
      }),
      headers: { "Content-Type": "application/json" },
      status: 200,
    };
  } catch {
    return {
      body: JSON.stringify({ error: "Could not read function info" }),
      status: 500,
    };
  }
};
