import {
  AARProblemJson,
  AarProblemResponse,
  Problem,
} from "@/adapters/send/definitions.js";
import { send } from "process";

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

export const sendProblemToAARProblemJson = (
  sendError: Problem,
): AARProblemJson => ({
  status: sendError.status,
  errors: sendError.errors,
  detail: sendError.detail ? sendError.detail : "Something went wrong",
  title: sendError.type
    ? `${sendError.type} - ${sendError.title}`
    : sendError.title,
  traceId: sendError.traceId,
});
