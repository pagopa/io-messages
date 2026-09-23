import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type RemoteContentMessage,
  remoteContentMessageSchema,
} from "../remote-content-message.js";

describe("remoteContentMessageSchema", () => {
  it("decodes an empty remote content message", () => {
    expect(remoteContentMessageSchema.parse({})).toEqual({});
  });

  it("decodes attachments and applies the default category", () => {
    const message: RemoteContentMessage = {
      attachments: [
        {
          content_type: "application/pdf",
          id: "attachment-id",
          name: "attachment.pdf",
          url: "https://example.com/attachment.pdf",
        },
      ],
      details: {
        custom_property: {
          nested: true,
        },
      },
    };
    const result = remoteContentMessageSchema.parse(message);

    expect(result).toEqual({
      attachments: [
        {
          category: "DOCUMENT",
          content_type: "application/pdf",
          id: "attachment-id",
          name: "attachment.pdf",
          url: "https://example.com/attachment.pdf",
        },
      ],
      details: {
        custom_property: {
          nested: true,
        },
      },
    });
    expectTypeOf(result).toEqualTypeOf<RemoteContentMessage>();
  });

  it.each([
    { attachments: [{ id: "", url: "https://example.com" }] },
    { attachments: [{ id: "attachment-id", url: "" }] },
    {
      attachments: [
        {
          category: "invalid",
          id: "attachment-id",
          url: "https://example.com",
        },
      ],
    },
  ])("rejects an invalid attachment", (message) => {
    expect(remoteContentMessageSchema.safeParse(message).success).toBe(false);
  });
});
