import { Container, ErrorResponse } from "@azure/cosmos";
import { z } from "zod";

import { ErrorInternal, ErrorNotFound } from "../../domain/error";
import {
  MassiveJob,
  MassiveJobID,
  MassiveJobSchema,
  MassiveJobsRepository,
} from "../../domain/massive-jobs";

export class CosmosMassiveJobsAdapter implements MassiveJobsRepository {
  constructor(private container: Container) {}

  async createMassiveJob(job: MassiveJob) {
    try {
      const result = await this.container.items.create(job);
      return result.item.id;
    } catch (err) {
      return new ErrorInternal("Failed to create massive job", err);
    }
  }

  async getMassiveJob(jobId: MassiveJobID) {
    try {
      const { resource, statusCode } = await this.container
        .item(jobId, jobId)
        .read();

      if (statusCode === 404) {
        return new ErrorNotFound(
          "Massive job not found",
          `Massive job with ID ${jobId} not found`,
        );
      }

      return MassiveJobSchema.parse(resource);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return new ErrorInternal(
          "Invalid Massive Job obtained from cosmos",
          err.issues,
        );
      }

      return new ErrorInternal("Failed to get Massive Job", err);
    }
  }

  async updateMassiveJob(job: MassiveJob) {
    try {
      const result = await this.container.item(job.id).replace(job);
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
