import { InfoUseCase } from "@/domain/use-cases/info";
import { HttpHandler } from "@azure/functions";

export const getInfoHandler =
  (infoUseCase: InfoUseCase): HttpHandler =>
  async () => {
    try {
      const pkg = await infoUseCase.execute();
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
