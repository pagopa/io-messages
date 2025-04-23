export interface HealthChecker {
  health(): Promise<void>;
  id: string;
}

export class HealthUseCase {
  #checkers: HealthChecker[];

  constructor(checkers: HealthChecker[]) {
    this.#checkers = checkers;
  }

  async execute(): Promise<string[]> {
    const checks = await Promise.all(
      this.#checkers.map(async (checker) => {
        const isHealthy = await checker.health().then(
          () => true,
          () => false,
        );
        return { id: checker.id, isHealthy };
      }),
    );

    const failures = checks.reduce<string[]>(
      (failures, check) =>
        check.isHealthy ? failures : [...failures, check.id],
      [],
    );
    return failures;
  }
}
