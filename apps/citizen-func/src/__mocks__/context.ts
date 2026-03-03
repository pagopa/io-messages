import { InvocationContext } from "@azure/functions";
import { vi } from "vitest";

export const context = {
  error: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
  trace: vi.fn(),
  warn: vi.fn(),
} as unknown as InvocationContext;
