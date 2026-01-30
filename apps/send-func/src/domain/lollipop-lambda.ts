import * as z from "zod";

import { sendHeadersSchema } from "./notification.js";

export const contentDigestHeaderSchema = z.object({
  "content-digest": z
    .string()
    .regex(/^sha-256=:[A-Za-z0-9+/=]+:$/)
    .optional(),
});
export const lollipopLambdaQuerySchema = z.object().loose();
export type LollipopLambdaQuery = z.infer<typeof lollipopLambdaQuerySchema>;
export const lollipopLambdaRequestBodySchema = z.object().loose();
export type LollipopLambdaRequestBody = z.infer<
  typeof lollipopLambdaRequestBodySchema
>;
export const lollipopLambdaHeadersSchema = sendHeadersSchema.merge(
  contentDigestHeaderSchema,
);

export type LollipopLambdaHeaders = z.infer<typeof lollipopLambdaHeadersSchema>;
export const lollipopLambdaRequestInfoSchema = z.object({
  bodyLength: z.number().int(),
  hasBody: z.boolean(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]),
  path: z.string(),
  queryParameters: z.object().loose().optional(),
  requestTime: z.string().optional(),
});

export const lollipopLambdaAuthorizerContextSchema = z
  .object({
    familyName: z.string().optional(),
    name: z.string().optional(),
    userId: z.string().optional(),
  })
  .loose();

export const lollipopLambdaRequestSummarySchema = z.object({
  authorizerContextKeys: z.array(z.string()).optional(),
  body: z.string().optional(),
  hasAuthorizerContext: z.boolean().optional(),
  headers: z.object().loose().optional(),
});

export const lollipopLambdaSuccessResponseSchema = z.object({
  data: z.object({
    authorizerContext: lollipopLambdaAuthorizerContextSchema.optional(),
    lollipopHeaders: z.object().loose().optional(),
    message: z.string(),
    request: lollipopLambdaRequestInfoSchema,
    requestBody: z.object().loose().optional(),
    summary: lollipopLambdaRequestSummarySchema.optional(),
    timestamp: z.string(),
  }),
  success: z.literal(true),
  timestamp: z.string(),
});

export type LollipopLambdaRequestInfo = z.infer<
  typeof lollipopLambdaRequestInfoSchema
>;
export type LollipopLambdaAuthorizerContext = z.infer<
  typeof lollipopLambdaAuthorizerContextSchema
>;
export type LollipopLambdaRequestSummary = z.infer<
  typeof lollipopLambdaRequestSummarySchema
>;
export type LollipopLambdaSuccessResponse = z.infer<
  typeof lollipopLambdaSuccessResponseSchema
>;

export interface LollipopLambdaClient {
  checkWithGet(
    headers: LollipopLambdaHeaders,
    query?: LollipopLambdaQuery,
  ): Promise<LollipopLambdaSuccessResponse>;

  checkWithPost(
    headers: LollipopLambdaHeaders,
    query?: LollipopLambdaQuery,
    requestBody?: LollipopLambdaRequestBody,
  ): Promise<LollipopLambdaSuccessResponse>;
}
