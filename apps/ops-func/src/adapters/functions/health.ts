import { HealthUseCase } from "@/domain/use-cases/health.js";
import { HttpHandler } from "@azure/functions";

export const healthcheck =
  (healthUseCase: HealthUseCase): HttpHandler =>
  async () => {
    const failures = await healthUseCase.execute();
    if (failures.length > 0) {
      return {
        body: `Service connection failed, cause: ${failures}`,
        status: 500,
      };
    }
    return {
      body: "It works!",
      status: 200,
    };
  };
