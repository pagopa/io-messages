import { aFiscalCode, aMaskedFiscalCode } from "@/__mocks__/message.js";
import { RecipientIdNotFoundError } from "@/adapters/redis/recipient.js";
import { Mocked, describe, expect, it, vi } from "vitest";

import {
  RecipientRepository,
  TokenizerClient,
  TokenizerEnvironment,
  getCachedRecipientId,
  tokenize,
} from "../tokenizer.js";

const recipientStore = new Map<string, unknown>();

const tokenizerClient: Mocked<TokenizerClient> = {
  tokenize: vi
    .fn()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .mockImplementation(async (_fiscalCode) => aMaskedFiscalCode),
};

const recipientRepository: Mocked<RecipientRepository> = {
  get: vi
    .fn()
    .mockImplementation(async (fiscalCode) =>
      recipientStore.get(`user:${fiscalCode.toLowerCase()}:recipient.id`),
    ),
  upsert: vi.fn().mockImplementation(async (fiscalCode) => {
    recipientStore.set(`user:${fiscalCode.toLowerCase()}:recipient.id`, event);
  }),
};

describe("tokenizeMessage", () => {
  it("should return a tokenized fiscal code if the tokenizer client api is successful", async () => {
    const run = await tokenize(aFiscalCode)({
      recipientRepository,
      tokenizerClient,
    } as TokenizerEnvironment);
    expect(run).toEqual(aMaskedFiscalCode);
  });

  it("should return an error if the tokenizer api call return an error", async () => {
    vi.spyOn(tokenizerClient, "tokenize").mockRejectedValue(
      new Error("Error during tokenizer api call"),
    );
    const run = tokenize(aFiscalCode)({
      recipientRepository,
      tokenizerClient,
    } as TokenizerEnvironment);
    await expect(run).rejects.toThrow("Error during tokenizer api call");
  });
});

describe("getCachedRecipientId", () => {
  it("should return a RecipientIdNotFoundError if the fiscal code is not present in the redis cache", async () => {
    const run = getCachedRecipientId(aFiscalCode)({
      recipientRepository,
      tokenizerClient,
    } as TokenizerEnvironment);
    await expect(run).rejects.toThrow(RecipientIdNotFoundError);
  });
  it("should return a cached masked fiscal code if present in the redis cache", async () => {
    recipientStore.set(
      `user:${aFiscalCode.toLowerCase()}:recipient.id`,
      aMaskedFiscalCode,
    );
    const run = await getCachedRecipientId(aFiscalCode)({
      recipientRepository,
      tokenizerClient,
    } as TokenizerEnvironment);
    expect(run).toEqual(aMaskedFiscalCode);
  });
});
