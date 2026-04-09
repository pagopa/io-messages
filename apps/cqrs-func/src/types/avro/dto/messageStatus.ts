// tslint:disable
import { BaseAvroRecord } from "../BaseAvroRecord";

export interface messageStatusInterface {
    id: string;
    messageId: string;
    updatedAt: number;
    version: number;
    isRead: boolean;
    isArchived: boolean;
    timestamp: number;
}

export class messageStatus extends BaseAvroRecord implements messageStatusInterface {

    public id: string = "undefined";
    public messageId: string = "undefined";
    public updatedAt: number = 0;
    public version: number = 0;
    public isRead: boolean = false;
    public isArchived: boolean = false;
    public timestamp: number = 0;

    public static readonly subject: string = "message-status";
    public static readonly schema: object = {
    "name": "messageStatus",
    "type": "record",
    "namespace": "dto",
    "doc": "Kafka JS schema for cosmos api container 'message-status'",
    "fields": [
        {
            "name": "id",
            "type": "string",
            "default": "undefined"
        },
        {
            "name": "messageId",
            "type": "string",
            "default": "undefined"
        },
        {
            "name": "updatedAt",
            "type": "long",
            "logicalType": "timestamp-millis",
            "default": 0
        },
        {
            "name": "version",
            "type": "int",
            "default": 0
        },
        {
            "name": "isRead",
            "type": "boolean",
            "default": false
        },
        {
            "name": "isArchived",
            "type": "boolean",
            "default": false
        },
        {
            "name": "timestamp",
            "type": "long",
            "logicalType": "timestamp-millis",
            "default": 0
        }
    ]
}

    public schema(): object {
        return messageStatus.schema;
    }

    public subject(): string {
        return messageStatus.subject;
    }
}
