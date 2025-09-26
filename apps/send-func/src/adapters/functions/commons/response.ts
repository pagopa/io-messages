import { HttpResponseInit } from "@azure/functions";

export const malformedBodyResponse = (detail: string): HttpResponseInit => ({
  jsonBody: {
    detail,
    status: 400,
  },
  status: 400,
});
