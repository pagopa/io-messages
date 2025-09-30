import { SendAARClientResponse } from "@/adapters/send/definitions.js";

export const malformedBodyResponse = (
  detail: string,
): SendAARClientResponse => ({
  jsonBody: {
    detail,
    status: 400,
  },
  status: 400,
});
