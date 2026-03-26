import { HealthCheckUseCase } from "@/domain/use-cases/health";
import { HttpHandler } from "@azure/functions";

export const getHealthHandler =
  (healthChecks: HealthCheckUseCase): HttpHandler =>
  async () => {
    try {
      const errors = await healthChecks.execute();

      return {
        body:
          errors.length > 0
            ? JSON.stringify({
                errors: errors.map((e) => `${e.message} ${e.cause}`),
                status: "ko",
              })
            : JSON.stringify({ status: "ok" }),
        status: errors.length > 0 ? 500 : 200,
      };
    } catch {
      return {
        body: JSON.stringify({ error: "Could not perform health checks" }),
        status: 500,
      };
    }
  };
