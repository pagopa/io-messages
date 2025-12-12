import {
  AARProblemJson,
  AarProblemResponse,
  AuthError,
  Problem,
} from "@/adapters/send/definitions.js";

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
  detail: sendError.detail ? sendError.detail : "Something went wrong",
  errors: sendError.errors,
  status: sendError.status,
  title: sendError.type
    ? `${sendError.type} - ${sendError.title}`
    : sendError.title,
  traceId: sendError.traceId,
});

export const sendAuthErrorToAARProblemJson = (
  sendAuthError: AuthError,
  status: number,
): AARProblemJson => ({
  detail: sendAuthError.message
    ? sendAuthError.message
    : "Something went wrong",
  status: status,
});
