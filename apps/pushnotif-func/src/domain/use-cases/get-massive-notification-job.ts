import { ErrorInternal, ErrorNotFound, ErrorValidation } from "../error";
import {
  MassiveJob,
  MassiveJobID,
  MassiveJobsRepository,
  MassiveJobStatusEnum,
  MassiveProgressRepository,
} from "../massive-jobs";

export class GetMassiveNotificationJobUseCase {
  constructor(
    private massiveJobRepository: MassiveJobsRepository,
    private massiveProgressRepository: MassiveProgressRepository,
  ) {}

  async execute(
    massiveJobId: MassiveJobID,
  ): Promise<ErrorInternal | ErrorNotFound | MassiveJob> {
    const massiveJob =
      await this.massiveJobRepository.getMassiveJob(massiveJobId);

    if (massiveJob instanceof Error) {
      return massiveJob;
    }

    if (
      massiveJob.status === MassiveJobStatusEnum.enum.CREATED ||
      massiveJob.status === MassiveJobStatusEnum.enum.COMPLETED
    ) {
      return massiveJob;
    }

    const massiveProgress =
      await this.massiveProgressRepository.listMassiveJobProgress(massiveJobId);

    if (massiveProgress instanceof Error) {
      return massiveProgress;
    }

    return {
      ...massiveJob,
      progress: massiveProgress,
    };
  }
}
