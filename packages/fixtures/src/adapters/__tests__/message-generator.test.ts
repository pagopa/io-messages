import { describe, test, expect, vi } from "vitest";
import { MessageGeneratorRepositoryAdapter } from "../message-generator.js";

const mockedUlid = "01JSM2JD7FRQJJCZGFZVMMD6H5";

vi.mock("ulid", () => ({
  ulid: vi.fn(() => mockedUlid),
}));

const messageGenerator = new MessageGeneratorRepositoryAdapter();

describe("MessageGeneratorRepositoryAdapter.generate", () => {
  test("should generate an array of messages without payments or remote content", () => {
    const messages = messageGenerator.generate(2, {
      includePayments: false,
      includeRemoteContents: false,
    });
    expect(messages).toHaveLength(2);
    messages.forEach((message) => {
      expect(message.content.payment_data).toBeUndefined();
      expect(message.content.third_party_data).toBeUndefined();
    });
  });

  test("should generate an array of messages with payments and remote content", () => {
    const messages = messageGenerator.generate(2, {
      includePayments: true,
      includeRemoteContents: true,
    });

    expect(messages).toHaveLength(2);
    messages.forEach((message) => {
      expect(message.content.payment_data).not.toBeUndefined();
      expect(message.content.third_party_data).not.toBeUndefined();
    });
  });
});
