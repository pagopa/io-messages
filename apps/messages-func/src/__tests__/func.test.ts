import { app } from "@azure/functions";
import { expect, it, vi } from "vitest";

import "../func.js";

vi.mock("@azure/functions", () => ({ app: { http: vi.fn() } }));

it("registers only the anonymous GET /api/info function", () => {
  expect(app.http).toHaveBeenCalledExactlyOnceWith("Info", {
    authLevel: "anonymous",
    handler: expect.any(Function),
    methods: ["GET"],
    route: "info",
  });
});
