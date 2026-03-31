import { Database } from "@azure/cosmos";

import { HealthChecker } from "../../domain/use-cases/health.js";

export class CosmosHealthchecker implements HealthChecker {
  db: Database;
  id = "Azure cosmos common db";

  constructor(db: Database) {
    this.db = db;
  }

  async health(): Promise<void> {
    await this.db.read();
  }
}
