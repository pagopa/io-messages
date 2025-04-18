import { HealthUseCase } from "@/domain/use-cases/health.js";
import { HttpHandler } from "@azure/functions";

export const healthcheck =
  (healthUseCase: HealthUseCase): HttpHandler =>
  async () =>
    await healthUseCase.execute();
