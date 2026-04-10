import { BaseAvroRecord } from "./BaseAvroRecord";
import { FeatureLevelType } from "./FeatureLevelTypeEnum";
import { MessageContentType } from "./MessageContentTypeEnum";

export interface MessageInterface {
  content_paymentData_amount: number;
  content_paymentData_invalidAfterDueDate: boolean;
  content_paymentData_noticeNumber: string;
  content_paymentData_payeeFiscalCode: string;
  content_subject: string;
  content_type?: MessageContentType | null;
  createdAt: number;
  dueDate: number;
  feature_level_type?: FeatureLevelType | null;
  fiscalCode: string;
  id: string;
  isPending: boolean;
  senderServiceId: string;
  senderUserId: string;
  timeToLiveSeconds: number;
}

export class Message extends BaseAvroRecord implements MessageInterface {
  public static readonly schema: object = {
    doc: "Kafka JS schema for cosmos api container 'messages'",
    fields: [
      {
        default: "undefined",
        name: "fiscalCode",
        type: "string",
      },
      {
        default: "undefined",
        name: "id",
        type: "string",
      },
      {
        default: "undefined",
        name: "senderServiceId",
        type: "string",
      },
      {
        default: "undefined",
        name: "senderUserId",
        type: "string",
      },
      {
        default: 3600,
        name: "timeToLiveSeconds",
        type: "int",
      },
      {
        default: 0,
        logicalType: "time-millis",
        name: "createdAt",
        type: "long",
      },
      {
        default: true,
        name: "isPending",
        type: "boolean",
      },
      {
        default: "undefined",
        name: "content_subject",
        type: "string",
      },
      {
        default: null,
        name: "feature_level_type",
        type: [
          "null",
          {
            name: "FeatureLevelType",
            symbols: ["STANDARD", "ADVANCED"],
            type: "enum",
          },
        ],
      },
      {
        default: null,
        name: "content_type",
        type: [
          "null",
          {
            name: "MessageContentType",
            symbols: ["GENERIC", "PAYMENT", "EU_COVID_CERT", "LEGAL", "PN"],
            type: "enum",
          },
        ],
      },
      {
        default: 0,
        name: "content_paymentData_amount",
        type: "int",
      },
      {
        default: "undefined",
        name: "content_paymentData_noticeNumber",
        type: "string",
      },
      {
        default: false,
        name: "content_paymentData_invalidAfterDueDate",
        type: "boolean",
      },
      {
        default: "undefined",
        name: "content_paymentData_payeeFiscalCode",
        type: "string",
      },
      {
        default: 0,
        logicalType: "time-millis",
        name: "dueDate",
        type: "long",
      },
    ],
    name: "message",
    namespace: "dto",
    type: "record",
  };
  public static readonly subject: string = "message";
  public content_paymentData_amount = 0;
  public content_paymentData_invalidAfterDueDate = false;
  public content_paymentData_noticeNumber = "undefined";
  public content_paymentData_payeeFiscalCode = "undefined";
  public content_subject = "undefined";
  public content_type?: MessageContentType | null = null;
  public createdAt = 0;
  public dueDate = 0;
  public feature_level_type?: FeatureLevelType | null = null;
  public fiscalCode = "undefined";
  public id = "undefined";
  public isPending = true;
  public senderServiceId = "undefined";

  public senderUserId = "undefined";
  public timeToLiveSeconds = 3600;

  public schema(): object {
    return Message.schema;
  }

  public subject(): string {
    return Message.subject;
  }
}
