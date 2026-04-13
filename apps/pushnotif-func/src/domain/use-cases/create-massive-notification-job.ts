import { ulid } from "ulid";

import { ErrorInternal } from "../error";
import {
  CreateMassiveJobPayload,
  MassiveJobResponse,
  MassiveJobStatusEnum,
  MassiveJobsRepository,
  massiveJobIDSchema,
} from "../massive-jobs";

export class CreateMassiveNotificationJobUseCase {
  constructor(private repository: MassiveJobsRepository) {}

  async execute(
    massiveJob: CreateMassiveJobPayload,
  ): Promise<ErrorInternal | MassiveJobResponse> {
    const job = {
      ...massiveJob,
      id: massiveJobIDSchema.parse(ulid()),
      status: MassiveJobStatusEnum.enum.CREATED,
    };

    const result = await this.repository.createMassiveJob(job);

    if (result instanceof ErrorInternal) {
      return result;
    }

    return { id: job.id, status: MassiveJobStatusEnum.enum.CREATED };
  }
}
