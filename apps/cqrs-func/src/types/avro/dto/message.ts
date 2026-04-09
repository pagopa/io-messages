// tslint:disable
import { BaseAvroRecord } from "../BaseAvroRecord";
import { FeatureLevelType } from "./FeatureLevelTypeEnum";
import { MessageContentType } from "./MessageContentTypeEnum";

export interface messageInterface {
    fiscalCode: string;
    id: string;
    senderServiceId: string;
    senderUserId: string;
    timeToLiveSeconds: number;
    createdAt: number;
    isPending: boolean;
    content_subject: string;
    feature_level_type?: null | FeatureLevelType;
    content_type?: null | MessageContentType;
    content_paymentData_amount: number;
    content_paymentData_noticeNumber: string;
    content_paymentData_invalidAfterDueDate: boolean;
    content_paymentData_payeeFiscalCode: string;
    dueDate: number;
}

export class message extends BaseAvroRecord implements messageInterface {

    public fiscalCode: string = "undefined";
    public id: string = "undefined";
    public senderServiceId: string = "undefined";
    public senderUserId: string = "undefined";
    public timeToLiveSeconds: number = 3600;
    public createdAt: number = 0;
    public isPending: boolean = true;
    public content_subject: string = "undefined";
    public feature_level_type?: null | FeatureLevelType = null;
    public content_type?: null | MessageContentType = null;
    public content_paymentData_amount: number = 0;
    public content_paymentData_noticeNumber: string = "undefined";
    public content_paymentData_invalidAfterDueDate: boolean = false;
    public content_paymentData_payeeFiscalCode: string = "undefined";
    public dueDate: number = 0;

    public static readonly subject: string = "message";
    public static readonly schema: object = {
    "name": "message",
    "type": "record",
    "namespace": "dto",
    "doc": "Kafka JS schema for cosmos api container 'messages'",
    "fields": [
        {
            "name": "fiscalCode",
            "type": "string",
            "default": "undefined"
        },
        {
            "name": "id",
            "type": "string",
            "default": "undefined"
        },
        {
            "name": "senderServiceId",
            "type": "string",
            "default": "undefined"
        },
        {
            "name": "senderUserId",
            "type": "string",
            "default": "undefined"
        },
        {
            "name": "timeToLiveSeconds",
            "type": "int",
            "default": 3600
        },
        {
            "name": "createdAt",
            "type": "long",
            "logicalType": "time-millis",
            "default": 0
        },
        {
            "name": "isPending",
            "type": "boolean",
            "default": true
        },
        {
            "name": "content_subject",
            "type": "string",
            "default": "undefined"
        },
        {
            "name": "feature_level_type",
            "type": [
                "null",
                {
                    "type": "enum",
                    "name": "FeatureLevelType",
                    "symbols": [
                        "STANDARD",
                        "ADVANCED"
                    ]
                }
            ],
            "default": null
        },
        {
            "name": "content_type",
            "type": [
                "null",
                {
                    "type": "enum",
                    "name": "MessageContentType",
                    "symbols": [
                        "GENERIC",
                        "PAYMENT",
                        "EU_COVID_CERT",
                        "LEGAL",
                        "PN"
                    ]
                }
            ],
            "default": null
        },
        {
            "name": "content_paymentData_amount",
            "type": "int",
            "default": 0
        },
        {
            "name": "content_paymentData_noticeNumber",
            "type": "string",
            "default": "undefined"
        },
        {
            "name": "content_paymentData_invalidAfterDueDate",
            "type": "boolean",
            "default": false
        },
        {
            "name": "content_paymentData_payeeFiscalCode",
            "type": "string",
            "default": "undefined"
        },
        {
            "name": "dueDate",
            "type": "long",
            "logicalType": "time-millis",
            "default": 0
        }
    ]
}

    public schema(): object {
        return message.schema;
    }

    public subject(): string {
        return message.subject;
    }
}
