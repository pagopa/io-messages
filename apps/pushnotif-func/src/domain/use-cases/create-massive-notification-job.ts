import { ulid } from "ulid";

import { ErrorInternal } from "../error";
import {
  CreateMassiveJobPayload,
  MassiveJobStatus,
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
      status: "CREATED" as MassiveJobStatus,
    };

    return this.repository.createMassiveJob(job);
  }
}
