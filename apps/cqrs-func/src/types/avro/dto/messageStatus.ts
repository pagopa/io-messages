import { BaseAvroRecord } from "../BaseAvroRecord";

export interface messageStatusInterface {
  id: string;
  isArchived: boolean;
  isRead: boolean;
  messageId: string;
  timestamp: number;
  updatedAt: number;
  version: number;
}

export class messageStatus
  extends BaseAvroRecord
  implements messageStatusInterface
{
  public static readonly schema: object = {
    doc: "Kafka JS schema for cosmos api container 'message-status'",
    fields: [
      {
        default: "undefined",
        name: "id",
        type: "string",
      },
      {
        default: "undefined",
        name: "messageId",
        type: "string",
      },
      {
        default: 0,
        logicalType: "timestamp-millis",
        name: "updatedAt",
        type: "long",
      },
      {
        default: 0,
        name: "version",
        type: "int",
      },
      {
        default: false,
        name: "isRead",
        type: "boolean",
      },
      {
        default: false,
        name: "isArchived",
        type: "boolean",
      },
      {
        default: 0,
        logicalType: "timestamp-millis",
        name: "timestamp",
        type: "long",
      },
    ],
    name: "messageStatus",
    namespace: "dto",
    type: "record",
  };
  public static readonly subject: string = "message-status";
  public id = "undefined";
  public isArchived = false;
  public isRead = false;
  public messageId = "undefined";
  public timestamp = 0;

  public updatedAt = 0;
  public version = 0;

  public schema(): object {
    return messageStatus.schema;
  }

  public subject(): string {
    return messageStatus.subject;
  }
}
