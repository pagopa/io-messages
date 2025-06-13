import * as ai from "applicationinsights";
import { vi } from "vitest";

export const defaultClient: ai.TelemetryClient = {
  trackException: vi.fn(),
} as unknown as ai.TelemetryClient;
