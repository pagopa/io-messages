const serviceIds = {
  generic: "01JR0QRJ8MX1PD06DE6X5FWXS6",
  none: "01JR0QRJ8MX1PD06DE6X5FWXS5",
  send: "01JR0QRJ8MX1PD06DE6X5FWXS5",
};
const deniedServiceIds = {
  generic: "01JR0QRJ8MX1PD06DE6X5FWXS8",
  none: "01JR0QRJ8MX1PD06DE6X5FWXS7",
  send: "01JR0QRJ8MX1PD06DE6X5FWXS7",
};
const recipients = [
  "LVTEST00A00A197X",
  "LVTEST00A00A198X",
  "LVTEST00A00A199X",
  "LVTEST00A00A200X",
];
const configurationIds = {
  generic: "01HC4K5M6N7P8Q9R0S1T2V3W4Y",
  send: "01HC4K5M6N7P8Q9R0S1T2V3W4X",
};
const createdAt = "2026-11-27T10:00:00.000Z";
const processedMessages = [];
const rejectedMessages = [];
let sequence = 0;

for (const fiscalCode of recipients) {
  for (const featureLevel of ["STANDARD", "ADVANCED"]) {
    for (const hasPayment of [false, true]) {
      for (const provider of ["none", "generic", "send"]) {
        for (const readStatus of featureLevel === "ADVANCED"
          ? ["READ", "UNREAD", "UNAVAILABLE"]
          : ["READ"]) {
          sequence += 1;
          const id = `01M1FX${String(sequence).padStart(20, "0")}`;
          const senderServiceId =
            readStatus === "UNAVAILABLE"
              ? deniedServiceIds[provider]
              : serviceIds[provider];
          const label = `${featureLevel} ${hasPayment ? "payment" : "no payment"} ${provider} ${readStatus}`;
          processedMessages.push({
            label,
            metadata: {
              id,
              indexedId: id,
              fiscalCode,
              senderServiceId,
              senderUserId: "local",
              createdAt,
              featureLevelType: featureLevel,
              isPending: false,
              timeToLiveSeconds: 604800,
            },
            status: {
              id: `${id}-0000000000000000`,
              fiscalCode,
              messageId: id,
              isArchived: false,
              isRead: readStatus === "READ",
              status: "PROCESSED",
              updatedAt: createdAt,
              version: 0,
            },
            content: {
              subject: `Local ${featureLevel} message fixture`,
              markdown: `This local message covers ${label} and provides valid content for happy-path endpoint testing.`,
              ...(hasPayment
                ? {
                    payment_data: {
                      amount: 100,
                      invalid_after_due_date: false,
                      notice_number: "312345678901234567",
                      payee: { fiscal_code: "12345678901" },
                    },
                  }
                : {}),
              ...(provider !== "none"
                ? {
                    third_party_data: {
                      configuration_id: configurationIds[provider],
                      has_attachments: provider === "send",
                      has_remote_content: true,
                      id:
                        provider === "send"
                          ? "ABCD-EFGH-IJKL-123456-M-7"
                          : "generic-remote-content-message",
                    },
                  }
                : {}),
            },
          });
        }
      }
    }
  }

  for (const featureLevel of ["STANDARD", "ADVANCED"]) {
    sequence += 1;
    const id = `01M1FX${String(sequence).padStart(20, "0")}`;
    rejectedMessages.push({
      metadata: {
        id,
        indexedId: id,
        fiscalCode,
        senderServiceId: serviceIds.none,
        senderUserId: "local",
        createdAt,
        featureLevelType: featureLevel,
        isPending: true,
        timeToLiveSeconds: 604800,
      },
      status: {
        id: `${id}-0000000000000000`,
        fiscalCode,
        messageId: id,
        isArchived: false,
        isRead: false,
        status: "REJECTED",
        rejection_reason: "SERVICE_NOT_ALLOWED",
        updatedAt: createdAt,
        version: 0,
      },
    });
  }
}

const profiles = recipients.map((fiscalCode) => ({
  fiscalCode,
  id: `${fiscalCode}-0000000000000002`,
  version: 2,
  email: "local@example.com",
  isEmailEnabled: true,
  isEmailValidated: true,
  isInboxEnabled: true,
  isWebhookEnabled: true,
  isTestProfile: false,
  lastAppVersion: "2.99.0",
  servicePreferencesSettings: { mode: "AUTO", version: 1 },
}));
const servicePreferences = recipients.flatMap((fiscalCode) =>
  [
    ...new Set([
      ...Object.values(serviceIds),
      ...Object.values(deniedServiceIds),
    ]),
  ].map((serviceId) => ({
    id: `${fiscalCode}-${serviceId}-0000000000000001`,
    fiscalCode,
    serviceId,
    settingsVersion: 1,
    isEmailEnabled: true,
    isInboxEnabled: true,
    isWebhookEnabled: true,
    accessReadMessageStatus: Object.values(deniedServiceIds).includes(serviceId)
      ? "DENY"
      : "ALLOW",
  })),
);

module.exports = {
  processedMessages,
  profiles,
  recipients,
  rejectedMessages,
  servicePreferences,
};
