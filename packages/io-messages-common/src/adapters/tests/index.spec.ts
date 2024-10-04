import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { loadConfigFromEnvironment } from "../config.js";

describe("loadConfigFromEnvironment", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("should not throw an error if the env vars are the same required by the zod env schema", async () => {
    const functionEntryPoint = vi.fn(async () => Promise.resolve());
    const envZodSchema = z.object({
      APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1),
    });
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", "stringTest");

    await expect(
      loadConfigFromEnvironment(functionEntryPoint, envZodSchema),
    ).resolves.toEqual(undefined);
    await expect(functionEntryPoint).toHaveBeenCalledOnce();
  });

  it("should not resolve if env vars are not the same required by the zod env schema", async () => {
    const functionEntryPoint = vi.fn(async () => Promise.resolve());
    const envZodSchema = z.object({
      APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1),
    });
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING_Wrong", "stringTest");

    await expect(
      loadConfigFromEnvironment(functionEntryPoint, envZodSchema),
    ).resolves.toEqual(undefined);
    await expect(functionEntryPoint).not.toHaveBeenCalledOnce();
  });

  it("should not reject if the funxtionEntryPoint throw an error", async () => {
    const functionEntryPoint = vi.fn(async () => Promise.reject());
    const envZodSchema = z.object({
      APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1),
    });
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", "stringTest");

    await expect(
      loadConfigFromEnvironment(functionEntryPoint, envZodSchema),
    ).resolves.toEqual(undefined);
    await expect(functionEntryPoint).toHaveBeenCalledOnce();
  });
});
