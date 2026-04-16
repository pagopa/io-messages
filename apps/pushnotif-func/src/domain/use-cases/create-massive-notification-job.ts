import { ulid } from "ulid";

import { ErrorInternal } from "../error";
import {
  CreateMassiveJobResponse,
  MassiveJobStatusEnum,
  MassiveJobsRepository,
  massiveJobIDSchema,
} from "../massive-jobs";

export class MakeCreateMassiveNotificationJobUseCase {
  constructor(private repository: MassiveJobsRepository) {}

  async execute(
    body: string,
    executionTimeInHours: number,
    title: string,
  ): Promise<CreateMassiveJobResponse | ErrorInternal> {
    const job = {
      body,
      executionTimeInHours,
      id: massiveJobIDSchema.parse(ulid()),
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
