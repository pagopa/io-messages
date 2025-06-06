import { Context } from "@azure/functions";
import { vi } from "vitest";

export const context = {
  log: {
    error: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
    warn: vi.fn(),
  },
} as unknown as Context;
