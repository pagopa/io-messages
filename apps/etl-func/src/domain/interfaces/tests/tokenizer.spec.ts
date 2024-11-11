import { MessageMetadata } from "@/domain/message.js";
import { describe, expect, it, vi } from "vitest";

import {
  MessageMetadataWithoutPII,
  TokenizerClient,
  maskSensitiveInfo,
} from "../tokenizer.js";

const aFiscalCode = "AAADPZ44E08F367A";
const aTokenizedFiscalCode = "3f5a5e37-63a0-423c-a108-94b535e03f91";

const aMessageMetadata: MessageMetadata = {
  createdAt: "12-02-2024",
  featureLevelType: "ADVANCED",
  fiscalCode: aFiscalCode,
  id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  indexedId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  senderServiceId: "aSenderServiceId",
  senderUserId: "aSenderUserId",
  timeToLiveSeconds: 0,
};

const aMessageMetadataWithFiscalCodeTokenized: MessageMetadataWithoutPII = {
  createdAt: "12-02-2024",
  featureLevelType: "ADVANCED",
  id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  indexedId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  recipientId: aTokenizedFiscalCode,
  senderServiceId: "aSenderServiceId",
  senderUserId: "aSenderUserId",
  timeToLiveSeconds: 0,
};

const tokenizerClient: TokenizerClient = {
  tokenize: async () => aTokenizedFiscalCode,
};

describe("tokenizeMessage", () => {
  it("should return a message with the fiscal code tokenized if the tokenizer client api is successful", async () => {
    const run = await maskSensitiveInfo(aMessageMetadata)(tokenizerClient);
    expect(run).toEqual(aMessageMetadataWithFiscalCodeTokenized);
  });

  it("should return an error if the tokenizer api call return an error", async () => {
    vi.spyOn(tokenizerClient, "tokenize").mockRejectedValue(
      new Error("Error during tokenizer api call"),
    );
    const run = maskSensitiveInfo(aMessageMetadata)(tokenizerClient);
    await expect(run).rejects.toThrow("Error during tokenizer api call");
  });
});
