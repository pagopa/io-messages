export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

export const getErrorDetail = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
