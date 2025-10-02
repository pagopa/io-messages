import { AarProblemResponse } from "@/adapters/send/definitions.js";

export const malformedBodyResponse = (detail: string): AarProblemResponse => ({
  jsonBody: {
    detail,
    status: 400,
  },
  status: 400,
});
