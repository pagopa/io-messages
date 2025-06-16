import { HealthUseCase } from "@/domain/use-cases/health.js";
import { HttpHandler } from "@azure/functions";

export const healthcheck =
  (healthUseCase: HealthUseCase): HttpHandler =>
  async () => {
    const failures = await healthUseCase.execute();
    return {
      jsonBody: failures,
      status: failures.length > 0 ? 500 : 200,
    };
  };
