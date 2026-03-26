import { ErrorInternal } from "@/domain/error";
import { MassiveJobSchema, MassiveJobsRepository } from "@/domain/massive-jobs";
import { HttpHandler } from "@azure/functions";
import { randomUUID } from "crypto";

const CreateMassiveJobPayloadSchema = MassiveJobSchema.omit({
  id: true,
  status: true,
});

export const createMassiveNotificationJob =
  (repository: MassiveJobsRepository): HttpHandler =>
  async (request) => {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return {
        body: JSON.stringify({ error: "Invalid JSON body" }),
        headers: { "Content-Type": "application/json" },
        status: 400,
      };
    }

    const parsed = CreateMassiveJobPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return {
        body: JSON.stringify({
          details: parsed.error.issues,
          error: "Bad Request",
        }),
        headers: { "Content-Type": "application/json" },
        status: 400,
      };
    }

    const job = {
      ...parsed.data,
      id: randomUUID(),
      status: "CREATED" as const,
    };

    const result = await repository.createMassiveJob(job);
    if (result instanceof ErrorInternal) {
      return {
        body: JSON.stringify({ error: result.message }),
        headers: { "Content-Type": "application/json" },
        status: 500,
      };
    }

    return {
      body: JSON.stringify({ id: result }),
      headers: { "Content-Type": "application/json" },
      status: 201,
    };
  };
