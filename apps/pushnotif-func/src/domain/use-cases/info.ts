import { readFile } from "fs/promises";
import { join } from "path";

export class InfoUseCase {
  public async execute(): Promise<{ name: string; version: string }> {
    const packageJsonPath = join(process.cwd(), "package.json");
    const pkgRaw = await readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(pkgRaw);
    return {
      name: pkg.name,
      version: pkg.version,
    };
  }
}
