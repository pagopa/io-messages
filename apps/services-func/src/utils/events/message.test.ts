import { describe, expect, it } from "vitest";

import {
  CreatedMessageEvent,
  CreatedMessageEventSenderMetadata,
} from "./message";

const senderMetadata = {
  organizationFiscalCode: "01234567890",
  organizationName: "Organization",
  requireSecureChannels: false,
  serviceCategory: "STANDARD",
  serviceName: "Service",
  serviceUserEmail: "service@example.com",
};

describe("CreatedMessageEvent", () => {
  it("decodes events without serviceVersion", () => {
    const result = CreatedMessageEvent.decode({ messageId: "message-id" });

    expect(result._tag).toBe("Right");
  });

  it("decodes existing events with serviceVersion", () => {
    const result = CreatedMessageEvent.decode({
      messageId: "message-id",
      serviceVersion: 1,
    });

    expect(result._tag).toBe("Right");
  });
});

describe("CreatedMessageEventSenderMetadata", () => {
  it("decodes sender metadata without departmentName", () => {
    const result = CreatedMessageEventSenderMetadata.decode(senderMetadata);

    expect(result._tag).toBe("Right");
  });

  it("decodes existing sender metadata with departmentName", () => {
    const result = CreatedMessageEventSenderMetadata.decode({
      ...senderMetadata,
      departmentName: "Department",
    });

    expect(result._tag).toBe("Right");
  });
});
