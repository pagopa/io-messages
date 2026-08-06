import { describe, expect, it } from "vitest";

import { rcConfigurationSchema } from "../../domain/remote-content.js";
import { RcConfigurationResponseSchema } from "../remote-content.js";

const aResponse = {
  configurationId: "not-a-domain-ulid",
  description: "",
  disableLollipopFor: ["not-a-fiscal-code"],
  hasPrecondition: "ALWAYS",
  id: "",
  isLollipopEnabled: false,
  name: "",
  userId: "",
};

describe("remote content contracts", () => {
  it("keeps the inbound response contract distinct from the domain entity", () => {
    expect(RcConfigurationResponseSchema.safeParse(aResponse).success).toBe(
      true,
    );
    expect(rcConfigurationSchema.safeParse(aResponse).success).toBe(false);
  });
});
