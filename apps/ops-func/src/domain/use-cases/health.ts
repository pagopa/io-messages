import { Database } from "@azure/cosmos";

export class HealthUseCase {
  db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async execute() {
    try {
      await this.db.read();
      return {
        body: "it works!",
      };
    } catch (error) {
      return {
        body: "Service connection failed",
        status: 500,
      };
    }
  }
}
