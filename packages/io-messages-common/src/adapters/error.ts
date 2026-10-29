export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

export const getErrorDetail = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const toErrorBody = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  try {
    return JSON.stringify(error) ?? "unreadable response body";
  } catch {
    return "unreadable response body";
  }
};
