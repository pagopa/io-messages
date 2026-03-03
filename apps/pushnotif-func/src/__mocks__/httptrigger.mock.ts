/**
 * Shared test helpers for Azure Functions v4 Express Adapter tests
 */

import {
  HttpRequest,
  HttpRequestInit,
  InvocationContext,
} from "@azure/functions";
import { vi } from "vitest";

/**
 * Creates a mock InvocationContext for testing
 */
export const createMockContext = (): InvocationContext =>
  ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
    trace: vi.fn(),
    warn: vi.fn(),
  }) as unknown as InvocationContext;

/**
 * Creates a mock HttpRequest for testing.
 * Uses the real HttpRequest constructor with sensible defaults.
 */
export const createMockRequest = (init?: HttpRequestInit): HttpRequest => {
  const defaultInit: HttpRequestInit = {
    method: init?.body ? "POST" : "GET",
    params: {},
    url: "http://localhost/test",
  };

  return new HttpRequest({ ...defaultInit, ...init });
};
