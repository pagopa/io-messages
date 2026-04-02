import { ulid } from "ulid";

import { ErrorInternal } from "../error";
import {
  CreateMassiveJobPayload,
  MassiveJobStatusEnum,
  MassiveJobsRepository,
} from "../massive-jobs";

export class CreateMassiveNotificationJobUseCase {
  constructor(private repository: MassiveJobsRepository) {}

  async execute(
    massiveJob: CreateMassiveJobPayload,
  ): Promise<ErrorInternal | string> {
    const job = {
      ...massiveJob,
      id: ulid(),
      status: MassiveJobStatusEnum.enum.CREATED,
    };

    return this.repository.createMassiveJob(job);
  }
}
