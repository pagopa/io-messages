import { ErrorInternal } from "../error";
import { HealthCheck } from "../health";

export class HealthCheckUseCase {
  constructor(private healthChecks: HealthCheck[]) {}

  public async execute(): Promise<ErrorInternal[]> {
    const healthChecksResults = await Promise.all(this.healthChecks);

    const errors = healthChecksResults.filter(
      (result) => result instanceof ErrorInternal,
    );

    return errors;
  }
}
