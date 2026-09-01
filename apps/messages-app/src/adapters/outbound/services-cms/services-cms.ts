import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";
import z from "zod";

import { MalformedEntityError } from "../../../application/ports/error.js";
import { ServicesCmsRepository } from "../../../application/ports/services-cms.js";
import { authorizedCidrSchema } from "../../../domain/client-ip.js";

const organizationSchema = z.object({
  department_name: z.string().min(1),
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

const servicesCmsDetailSchema = z.object({
  age: z
    .object({
      max: z.number().int().min(0).max(999).optional(),
      min: z.number().int().min(0).max(999).optional(),
    })
    .optional(),
  authorized_cidrs: z.array(authorizedCidrSchema),
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
type ServicesCmsDetail = z.TypeOf<typeof servicesCmsDetailSchema>;

export class ServicesCmsHttpClientAdapter implements ServicesCmsRepository {
  #apimBaseURL: URL;

  constructor(
    apimBaseURL: URL,
    private apimSubscriptionKey: string,
    private logger: Logger,
  ) {
    this.#apimBaseURL = apimBaseURL;
  }

  async #getServicesCmsDetailsByServiceId(
    serviceID: string,
  ): Promise<
    Result<
      ServicesCmsDetail,
      GenericError | MalformedEntityError | NotFoundError | TooManyRequestsError
    >
  > {
    const serviceDetailURL = new URL(this.#apimBaseURL);
    serviceDetailURL.pathname = `${serviceDetailURL.pathname.replace(/\/$/, "")}/api/v1/internal/services/${serviceID}`;

    const response = await ResultAsync.fromPromise(
      fetch(serviceDetailURL.toString(), {
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": this.apimSubscriptionKey,
        },
      }),
      (err) => new GenericError(String(err)),
    );

    if (response.isErr()) return err(response.error);

    switch (response.value.status) {
      case 200: {
        const jsonResponse = await ResultAsync.fromPromise(
          response.value.json(),
          () =>
            new MalformedEntityError(
              `invalid json response while retrieving service detail for service ${serviceID}`,
            ),
        );

        if (jsonResponse.isErr()) return err(jsonResponse.error);

        const parsedResult = servicesCmsDetailSchema.safeParse(
          jsonResponse.value,
        );
        if (!parsedResult.success) {
          return err(
            new MalformedEntityError(
              `invalid service detail for service ${serviceID}: ${parsedResult.error.message}`,
            ),
          );
        }

        return ok(parsedResult.data);
      }

      case 400:
        return err(
          new MalformedEntityError(
            `invalid service identifier while retrieving service detail for service ${serviceID}`,
          ),
        );

      case 404:
        return err(
          new NotFoundError(
            "service detail",
            `cannot find service detail for service identified by serviceID: ${serviceID}`,
          ),
        );

      case 429:
        return err(new TooManyRequestsError());

      default:
        return err(
          new GenericError(
            `unexpected response while retrieving service detail for service ${serviceID}: ${response.value.status}`,
          ),
        );
    }
  }

  async getServicesCmsDetailsByServiceIds(
    serviceIDs: string[],
  ): Promise<
    Result<
      Map<
        string,
        Result<ServicesCmsDetail, MalformedEntityError | NotFoundError>
      >,
      GenericError | TooManyRequestsError
    >
  > {
    const results = await Promise.all(
      serviceIDs.map((serviceID) =>
        this.#getServicesCmsDetailsByServiceId(serviceID),
      ),
    );

    const detailsByServiceId = new Map<
      string,
      Result<ServicesCmsDetail, MalformedEntityError | NotFoundError>
    >();

    for (let index = 0; index < serviceIDs.length; index++) {
      const serviceID = serviceIDs[index];
      const result = results[index];

      if (result.isErr()) {
        if (
          result.error instanceof NotFoundError ||
          result.error instanceof MalformedEntityError
        ) {
          this.logger.trackEvent({
            name: "MessageDetailServicesAdapter.getMessageDetailsByServiceIds.failed.skippable",
            properties: {
              errorMessage: result.error.message,
              errorName: result.error.name,
              serviceID,
            },
          });

          detailsByServiceId.set(serviceID, err(result.error));
          continue;
        }

        return err(result.error);
      }

      detailsByServiceId.set(serviceID, ok(result.value));
    }

    return ok(detailsByServiceId);
  }
}
