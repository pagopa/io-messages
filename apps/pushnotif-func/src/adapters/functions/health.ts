import { HealthCheck } from "@/domain/health";
import { HttpHandler } from "@azure/functions";

import { ErrorInternal } from "../../domain/error";

export const getHealthHandler =
  (healthChecks: HealthCheck[]): HttpHandler =>
  async () => {
    try {
      const healthChecksResults = await Promise.all(
        healthChecks.map((hc) => hc()),
      );

      const errors = healthChecksResults.filter(
        (result) => result instanceof ErrorInternal,
      );

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
