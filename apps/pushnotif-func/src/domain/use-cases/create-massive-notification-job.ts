import { randomUUID } from "crypto";

import { ErrorInternal, ErrorValidation } from "../error";
import { MassiveJobSchema, MassiveJobsRepository } from "../massive-jobs";

const CreateMassiveJobPayloadSchema = MassiveJobSchema.omit({
  id: true,
  status: true,
});

export class CreateMassiveNotificationJobUseCase {
  constructor(private repository: MassiveJobsRepository) {}

  async execute(
    payload: unknown,
  ): Promise<ErrorInternal | ErrorValidation | string> {
    const parsed = CreateMassiveJobPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return new ErrorValidation("Invalid payload", {
        issues: parsed.error.issues,
      });
    }

    const job = {
      ...parsed.data,
      id: randomUUID(),
      status: "CREATED" as const,
    };

    const result = await this.repository.createMassiveJob(job);

    return result;
  }
}
