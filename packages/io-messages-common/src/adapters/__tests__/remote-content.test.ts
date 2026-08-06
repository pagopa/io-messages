import { describe, expect, it } from "vitest";

import { rcConfigurationSchema } from "../../domain/remote-content.js";
import { RcConfigurationResponseSchema } from "../remote-content.js";

const aResponse = {
  configuration_id: "01JAQ4HYBR5JZCS6K0DT7M1EV8",
  description: "a description",
  disable_lollipop_for: ["SPNDNL80R13C555X"],
  has_precondition: "ALWAYS",
  is_lollipop_enabled: false,
  name: "a name",
  user_id: "a-user-id",
};

describe("remote content contracts", () => {
  it("defines a snake-case response distinct from the domain entity", () => {
    expect(RcConfigurationResponseSchema.safeParse(aResponse).success).toBe(
      true,
    );
    expect(rcConfigurationSchema.safeParse(aResponse).success).toBe(false);
  });
});
