import { HealthChecker } from "@/domain/use-cases/health.js";
import { Database } from "@azure/cosmos";

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
