import {
  aarQrCodeValueSchema,
  attachmentMetadataSchema,
  checkQrMandateResponseSchema,
  thirdPartyMessageSchema,
} from "@/domain/notification.js";
import * as z from "zod";

export const aarProblemJsonSchema = z.object({
  detail: z.string(),
  errors: z
    .array(
      z.object({
        code: z.string(),
        detail: z.string().max(1024).optional(),
        element: z.string().optional(),
      }),
    )
    .optional(),
  instance: z.url().optional(),
  status: z.number().int().gte(100).lt(600),
  title: z.string().optional(),
  traceId: z.string().optional(),
  type: z.url().optional(),
});

export type AARProblemJson = z.TypeOf<typeof aarProblemJsonSchema>;

export const problemSchema = z.object({
  detail: z
    .string()
    .max(4096)
    .regex(/^.{0,4096}$/)
    .optional(),
  errors: z
    .array(
      z.object({
        code: z.string(),
        detail: z.string().max(1024).optional(),
        element: z.string().optional(),
      }),
    )
    .optional(),
  status: z.number().int().gte(100).lt(600),
  timestamp: z.iso.datetime({ offset: true }).optional(),
  title: z
    .string()
    .max(64)
    .regex(/^[ -~]{0,64}$/)
    .optional(),
  traceId: z.string().optional(),
  type: z.string().optional(),
});

export type Problem = z.TypeOf<typeof problemSchema>;

export const checkQrMandateRequestSchema = z.object({
  aarQrCodeValue: aarQrCodeValueSchema,
});

export type CheckQrMandateRequest = z.TypeOf<
  typeof checkQrMandateRequestSchema
>;

export const aarProblemResponseSchema = z.object({
  jsonBody: aarProblemJsonSchema,
  status: z.number().int(),
});
export type AarProblemResponse = z.TypeOf<typeof aarProblemResponseSchema>;

export const aarQRCodeCheckResponseSchema = z.object({
  jsonBody: z.union([checkQrMandateResponseSchema, aarProblemJsonSchema]),
  status: z.number().int(),
});

export type AarQRCodeCheckResponse = z.TypeOf<
  typeof aarQRCodeCheckResponseSchema
>;

export const aarGetNotificationResponseSchema = z.object({
  jsonBody: z.union([aarProblemJsonSchema, thirdPartyMessageSchema]),
  status: z.number().int(),
});

export type AarGetNotificationResponse = z.TypeOf<
  typeof aarGetNotificationResponseSchema
>;

export const aarGetAttachmentResponseSchema = z.object({
  jsonBody: z.union([aarProblemJsonSchema, attachmentMetadataSchema]),
  status: z.number().int(),
});

export type AarGetAttachmentResponse = z.TypeOf<
  typeof aarGetAttachmentResponseSchema
>;
