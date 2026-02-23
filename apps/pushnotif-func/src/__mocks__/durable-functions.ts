import { InvocationContext } from "@azure/functions";
import { vi } from "vitest";

export const mockStartNew = vi.fn();

export const getClient = vi.fn(() => ({
  startNew: mockStartNew,
}));

export const RetryOptions = vi.fn(() => ({}));

// Mock for durable-functions v3 app registration
export const app = {
  activity: vi.fn(),
  orchestration: vi.fn(),
};

// Mock for durable-functions v3 input
export const input = {
  durableClient: vi.fn(() => ({})),
};

// Kept for backward compatibility in tests
export const context = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
  trace: vi.fn(),
  warn: vi.fn(),
} as unknown as InvocationContext;
