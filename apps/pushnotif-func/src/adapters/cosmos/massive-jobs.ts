import { ErrorInternal, ErrorNotFound } from "@/domain/error";
import { MassiveJob, MassiveJobsRepository } from "@/domain/massive-jobs";
import { Container, Database, ErrorResponse } from "@azure/cosmos";

export class CosmosMassiveJobsAdapter implements MassiveJobsRepository {
  container: Container;

  constructor(cosmosdbInstance: Database, containerName: string) {
    this.container = cosmosdbInstance.container(containerName);
  }

  async createMassiveJob(job: MassiveJob) {
    try {
      const result = await this.container.items.create(job);
      return result.item.id;
    } catch (err) {
      return new ErrorInternal("Failed to create massive job", err);
    }
  }

  async updateMassiveJob(job: MassiveJob) {
    try {
      const result = await this.container.items.upsert(job, {});
      return result.item.id;
    } catch (err) {
      if (err instanceof ErrorResponse) {
        switch (err.code) {
          case 404:
            return new ErrorNotFound("Massive job not found", err);

          default:
            return new ErrorInternal("Failed to update massive job", err);
        }
      }
      return new ErrorInternal("Failed to update massive job", err);
    }
  }
}
