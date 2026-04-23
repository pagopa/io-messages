import { ulid } from "ulid";

import { ErrorInternal } from "../error";
import {
  CreateMassiveJobResult,
  MassiveJobStatusEnum,
  MassiveJobsRepository,
  massiveJobIDSchema,
} from "../massive-jobs";

export class MakeCreateMassiveNotificationJobUseCase {
  constructor(private repository: MassiveJobsRepository) {}

  async execute(
    message: string,
    executionTimeInHours: number,
    title: string,
  ): Promise<CreateMassiveJobResult | ErrorInternal> {
    const job = {
      executionTimeInHours,
      id: massiveJobIDSchema.parse(ulid()),
      message,
      status: MassiveJobStatusEnum.enum.CREATED,
      title,
    };

    const result = await this.repository.createMassiveJob(job);

    if (result instanceof ErrorInternal) {
      return result;
    }

    return { id: job.id, status: MassiveJobStatusEnum.enum.CREATED };
  }
}
