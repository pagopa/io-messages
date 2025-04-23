import { Database, ErrorResponse } from "@azure/cosmos";

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
      if (error instanceof ErrorResponse) {
        return {
          body: `Service connection failed: ${error.name} code: ${error.code} cause: ${error.cause}`,
          status: 500,
        };
      }
      return {
        body: "Service connection failed",
        status: 500,
      };
    }
  }
}
