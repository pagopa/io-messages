import { HttpRequest, HttpResponse, InvocationContext } from "@azure/functions";
import { GenericError } from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import { makeInfoHandler } from "../info.handler.js";

const request = new HttpRequest({
  method: "GET",
  url: "http://localhost:7077/api/info",
});

describe("Info handler", () => {
  it("responds with the app name and version as JSON", async () => {
    const metadata = { name: "messages-func", version: "1.2.3" };
    const getInfo = vi.fn().mockResolvedValue(ok(metadata));
    const context = new InvocationContext();

    const response = new HttpResponse(
      await makeInfoHandler(getInfo)(request, context),
    );

    expect(getInfo).toHaveBeenCalledExactlyOnceWith({});
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual(metadata);
  });

  it("logs the failure but does not expose internal details", async () => {
    const internalError = new GenericError(
      "Unable to read application package.json",
    );
    const getInfo = vi.fn().mockResolvedValue(err(internalError));
    const context = new InvocationContext();
    const logError = vi.spyOn(context, "error").mockImplementation(() => {});

    const response = new HttpResponse(
      await makeInfoHandler(getInfo)(request, context),
    );

    expect(logError).toHaveBeenCalledExactlyOnceWith(
      "Could not read function info",
      internalError.message,
    );
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({
      error: "Could not read function info",
    });
  });
});
