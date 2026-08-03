import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";
import z from "zod";

import { MalformedEntityError } from "./error.js";

const organizationSchema = z.object({
  department_name: z.string().min(1).optional(),
  fiscal_code: z.string().regex(new RegExp("^\\d{11}$")),
  name: z.string().min(1),
});

const topicSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
});

const serviceMetadataSchema = z.object({
  address: z.string().min(1).optional(),
  app_android: z.string().min(1).optional(),
  app_ios: z.string().min(1).optional(),
  category: z.enum(["STANDARD", "SPECIAL"]).optional(),
  cta: z.string().min(1).optional(),
  custom_special_flow: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  group_id: z.string().min(1).optional(),
  pec: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  privacy_url: z.string().min(1).optional(),
  scope: z.enum(["NATIONAL", "LOCAL"]),
  support_url: z.string().min(1).optional(),
  token_name: z.string().min(1).optional(),
  topic: topicSchema.optional(),
  tos_url: z.string().min(1).optional(),
  web_url: z.string().min(1).optional(),
});

const serviceStatusSchema = z.union([
  z.object({
    value: z.enum([
      "draft",
      "submitted",
      "approved",
      "deleted",
      "published",
      "unpublished",
    ]),
  }),
  z.object({
    reason: z.string(),
    value: z.literal("rejected"),
  }),
]);

export const servicesCmsDetailSchema = z.object({
  age: z
    .object({
      max: z.number().int().min(0).max(999).optional(),
      min: z.number().int().min(0).max(999).optional(),
    })
    .optional(),
  authorized_cidrs: z.array(z.string()),
  authorized_recipients: z.array(
    z
      .string()
      .regex(
        new RegExp(
          "^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Za-z][0-9LMNPQRSTUV]{3}[A-Z]$",
        ),
      ),
  ),
  description: z.string().min(1),
  id: z.ulid(),
  last_update: z.string().datetime(),
  max_allowed_payment_amount: z.number().int().min(0).max(9999999999),
  metadata: serviceMetadataSchema,
  name: z.string().min(1),
  organization: organizationSchema,
  require_secure_channel: z.boolean(),
  status: serviceStatusSchema,
});
export type ServicesCmsDetail = z.TypeOf<typeof servicesCmsDetailSchema>;

export interface ServicesCmsRepository {
  getServicesCmsDetailsByServiceIds(
    serviceIDs: string[],
  ): Promise<
    Result<
      Map<
        string,
        Result<ServicesCmsDetail, MalformedEntityError | NotFoundError>
      >,
      GenericError | TooManyRequestsError
    >
  >;
}
