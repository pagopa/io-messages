import avro, { Schema } from "avsc";

export const messageSchema = avro.Type.forSchema({
  fields: [
    {
      doc: "An integer that indicates the version of the schema.",
      name: "schema_version",
      type: "int",
    },
    {
      name: "op",
      type: {
        doc: "List of operations that can be done to a message.",
        name: "CrudOperation",
        symbols: ["CREATE"],
        type: "enum",
      },
    },
    {
      doc: "An ULID that identifies the message inside the message collection.",
      name: "id",
      type: "string",
    },
    {
      doc: "The id of the service that sent the message.",
      name: "sender_service_id",
      type: "string",
    },
    {
      doc: "The id of the user that sent the message.",
      name: "sender_user_id",
      type: "string",
    },
    {
      doc: "The subject of the message.",
      name: "subject",
      type: "string",
    },
    {
      default: "GENERIC",
      doc: "Indicates the type of the message.",
      name: "content_type",
      type: {
        name: "ContentType",
        symbols: [
          "GENERIC",
          "PAYMENT",
          "EU_COVID_CERT",
          "SEND",
          "PAGOPA_RECEIPT",
        ],
        type: "enum",
      },
    },
    {
      default: null,
      doc: "An integer that indicates the amount of the payment.",
      name: "payment_data_amount",
      type: ["null", "int"],
    },
    {
      default: null,
      doc: "An id that identifies the the payment.",
      name: "payment_data_notice_number",
      type: ["null", "string"],
    },
    {
      default: null,
      doc: "A boolean that indicates if the payment is considered invalid after the due date.",
      name: "payment_data_invalid_after_due_date",
      type: ["null", "boolean"],
    },
    {
      default: null,
      doc: "The fiscal code of the payee.",
      name: "payment_data_payee_fiscal_code",
      type: ["null", "string"],
    },
    {
      default: false,
      doc: "A boolean that indicates whether the message contains sensitive informations. If this value is true the push notification sent is anonymous and the email notification will not be sent.",
      name: "require_secure_channels",
      type: "boolean",
    },
    {
      doc: "A timestamp that indicates when the message was created.",
      logicalType: "timestamp-millis",
      name: "timestamp",
      type: "long",
    },
    {
      default: "STANDARD",
      doc: "A field that indicates whether the message is PREMIUM or not.",
      name: "feature_level_type",
      type: {
        name: "FeatureLevelType",
        symbols: ["STANDARD", "ADVANCED"],
        type: "enum",
      },
    },
    {
      doc: "Tokenized fiscal code of the citizen.",
      name: "recipient_id",
      type: "string",
    },
    {
      default: false,
      doc: "A boolean that indicates whether the message has remote content or not.",
      name: "has_remote_content",
      type: "boolean",
    },
    {
      default: false,
      doc: "A boolean that indicates whether the message has remote precondition or not.",
      name: "has_precondition",
      type: "boolean",
    },
    {
      default: false,
      doc: "A boolean that indicates whether the message has remote attachments or not.",
      name: "has_attachments",
      type: "boolean",
    },
  ],
  name: "Message",
  namespace: "it.ioapp.com.message",
  type: "record",
} as Schema);

export const messageStatusAvroSchema = avro.Type.forSchema({
  fields: [
    {
      doc: "An integer that indicates the version of the schema.",
      name: "schema_version",
      type: "int",
    },
    {
      name: "op",
      type: {
        doc: "List of operations that can be done to a message.",
        name: "MessageCrudOperation",
        symbols: ["CREATE", "UPDATE", "DELETE"],
        type: "enum",
      },
    },
    {
      doc: "An id that identifies the status of the message inside the message-status collection.",
      name: "id",
      type: "string",
    },
    {
      doc: "An ULID that identifies the message inside the message collection.",
      name: "message_id",
      type: "string",
    },
    {
      doc: "An integer that indicates the version of the status.",
      name: "version",
      type: "int",
    },
    {
      doc: "List of possible message statuses.",
      name: "status",
      type: {
        name: "MessageStatus",
        symbols: ["ACCEPTED", "FAILED", "PROCESSED", "REJECTED", "THROTTLED"],
        type: "enum",
      },
    },
    {
      doc: "Reason in case of message rejection.",
      name: "rejection_reason",
      type: {
        name: "MessageRejectionReason",
        symbols: ["SERVICE_NOT_ALLOWED", "USER_NOT_FOUND", "UNKNOWN"],
        type: "enum",
      },
      default: "UNKNOWN",
    },
    {
      doc: "Boolean that indicates if the message has been read.",
      name: "is_read",
      type: "boolean",
    },
    {
      doc: "Boolean that indicates if the message has been archived.",
      name: "is_archived",
      type: "boolean",
    },
    {
      doc: "A timestamp that indicates when the status was created.",
      name: "created_at",
      type: "long",
    },
  ],
  name: "message_status",
  namespace: "dto",
  type: "record",
});
