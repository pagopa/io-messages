import { describe, expect, it, vi } from "vitest";

import { TokenizerClient, maskSensitiveInfo } from "../tokenizer.js";

const aFiscalCode = "AAADPZ44E08F367A";
const aTokenizedFiscalCode = "3f5a5e37-63a0-423c-a108-94b535e03f91";

const tokenizerClient: TokenizerClient = {
  tokenize: async () => aTokenizedFiscalCode,
};

describe("tokenizeMessage", () => {
  it("should return a message with the fiscal code tokenized if the tokenizer client api is successful", async () => {
    const run = await maskSensitiveInfo(aFiscalCode)(tokenizerClient);
    expect(run).toEqual(aTokenizedFiscalCode);
  });

  it("should return an error if the tokenizer api call return an error", async () => {
    vi.spyOn(tokenizerClient, "tokenize").mockRejectedValue(
      new Error("Error during tokenizer api call"),
    );
    const run = maskSensitiveInfo(aFiscalCode)(tokenizerClient);
    await expect(run).rejects.toThrow("Error during tokenizer api call");
  });
});
