import { Context } from "@azure/functions";
import { vi } from "vitest";

export const mockStartNew = vi.fn();

export const getClient = vi.fn(() => ({
  startNew: mockStartNew,
}));

export const orchestrator = vi.fn();

export const RetryOptions = vi.fn(() => ({}));

export const context = {
  log: {
    error: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
    warn: vi.fn(),
  },
} as unknown as Context;
