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
      id: ulid(),
      body: massiveJob.body,
      title: massiveJob.title,
      status: "CREATED" as MassiveJobStatus,
      executionTimeInHours: massiveJob.executionTimeInHours,
      startTimeTimestamp: massiveJob.startTimeTimestamp,
    };

    return this.repository.createMassiveJob(job);
  }
}
