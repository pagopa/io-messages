import { AarProblemResponse } from "@/adapters/send/definitions.js";

export const malformedBodyResponse = (
  detail: string,
  title?: string,
): AarProblemResponse => ({
  jsonBody: {
    detail,
    status: 400,
    title,
  },
  status: 400,
});
