import { describe, expect, it, vi } from "vitest";

import { MessageWithoutPII, TokenizerClient, tokenize } from "../tokenizer.js";

const aFiscalCode = "AAADPZ44E08F367A";
const aTokenizedFiscalCode = "3f5a5e37-63a0-423c-a108-94b535e03f91";

const aMessageWithFiscalCodeTokenized: MessageWithoutPII = {
  fiscalCode: aTokenizedFiscalCode,
};

const tokenizerClient: TokenizerClient = {
  maskSensitiveInfo: async () => aTokenizedFiscalCode,
};

describe("tokenizeMessage", () => {
  it("should return a message with the fiscal code tokenized if the tokenizer client api is successful", async () => {
    const run = await tokenize({ fiscalCode: aFiscalCode })(tokenizerClient);
    expect(run).toEqual(aMessageWithFiscalCodeTokenized);
  });

  it("should return an error if the tokenizer api call return an error", async () => {
    vi.spyOn(tokenizerClient, "maskSensitiveInfo").mockRejectedValue(
      new Error("Error during tokenizer api call"),
    );
    const run = tokenize({ fiscalCode: aFiscalCode })(tokenizerClient);
    await expect(run).rejects.toThrow("Error during tokenizer api call");
  });
});
