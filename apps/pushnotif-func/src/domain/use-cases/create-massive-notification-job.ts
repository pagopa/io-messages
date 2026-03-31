import { ulid } from "ulid";

import { ErrorInternal, ErrorValidation } from "../error";
import {
  CreateMassiveJobPayload,
  MassiveJobStatus,
  MassiveJobsRepository,
} from "../massive-jobs";

export class CreateMassiveNotificationJobUseCase {
  constructor(private repository: MassiveJobsRepository) {}

  async execute(
    massiveJob: CreateMassiveJobPayload,
  ): Promise<ErrorInternal | ErrorValidation | string> {
    const job = {
      body: massiveJob.body,
      executionTimeInHours: massiveJob.executionTimeInHours,
      id: ulid(),
      startTimeTimestamp: massiveJob.startTimeTimestamp,
      status: "CREATED" as MassiveJobStatus,
      title: massiveJob.title,
    };

    return this.repository.createMassiveJob(job);
  }
}
