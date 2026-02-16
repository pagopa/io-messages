import { InvocationContext } from "@azure/functions";

export interface ActivityLogger {
  readonly debug: (msg: string) => void;
  readonly error: (msg: string) => void;
  readonly info: (msg: string) => void;
  readonly warn: (msg: string) => void;
}

/**
 * Creates a logger object for an activity bound to an InvocationContext.
 *
 * @param {InvocationContext} context the invocation context for the activity
 * @param {string} logPrefix a string to prepend to every log entry, usually the name of the activity. Default: empty string
 * @returns {ActivityLogger} a logger instance
 */
export const createLogger = (
  context: InvocationContext,
  logPrefix = "",
): ActivityLogger => ({
  debug: (msg: string): void => context.debug(`${logPrefix}|${msg}`),
  error: (msg: string): void => context.error(`${logPrefix}|${msg}`),
  info: (msg: string): void => context.log(`${logPrefix}|${msg}`),
  warn: (msg: string): void => context.warn(`${logPrefix}|${msg}`),
});
