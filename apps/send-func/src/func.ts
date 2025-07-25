import { app } from "@azure/functions";

import { healthcheck } from "./adapters/functions/health.js";
import { HealthUseCase } from "./domain/use-cases/health.js";

const main = async (): Promise<void> => {
  const healthcheckUseCase = new HealthUseCase([]);

  app.http("Health", {
    authLevel: "anonymous",
    handler: healthcheck(healthcheckUseCase),
    methods: ["GET"],
    route: "health",
  });
};

await main();
