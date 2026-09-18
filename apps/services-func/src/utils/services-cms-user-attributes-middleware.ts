import type { ServiceModel } from "@pagopa/io-functions-commons/dist/src/models/service";
import type { IAzureUserAttributes } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_user_attributes";

import { AzureUserAttributesMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_user_attributes";
import { IRequestMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseErrorTooManyRequests,
  ResponseErrorForbiddenNotAuthorized,
  ResponseErrorInternal,
  ResponseErrorTooManyRequests,
} from "@pagopa/ts-commons/lib/responses";
import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

import {
  ServicesCmsClient,
  ServicesCmsServiceDetails,
} from "../clients/services-cms";

export interface ICreateMessageUserAttributes {
  readonly email: EmailString;
  readonly kind: "IAzureUserAttributes";
  readonly service: CreateMessageServiceDetails;
}

export type CreateMessageServiceDetails = {
  readonly departmentName?: IAzureUserAttributes["service"]["departmentName"];
  readonly serviceCategory?: ServicesCmsServiceDetails["serviceCategory"];
  readonly serviceVersion?: IAzureUserAttributes["service"]["version"];
} & Omit<ServicesCmsServiceDetails, "serviceCategory">;

type UserAttributesMiddleware = IRequestMiddleware<
  | "IResponseErrorForbiddenNotAuthorized"
  | "IResponseErrorInternal"
  | "IResponseErrorQuery"
  | "IResponseErrorTooManyRequests",
  ICreateMessageUserAttributes
>;

const toServicesCmsDetails = (
  attributes: IAzureUserAttributes,
): CreateMessageServiceDetails => ({
  authorizedCIDRs: attributes.service.authorizedCIDRs,
  authorizedRecipients: attributes.service.authorizedRecipients,
  departmentName: attributes.service.departmentName,
  maxAllowedPaymentAmount: attributes.service.maxAllowedPaymentAmount,
  organizationFiscalCode: attributes.service.organizationFiscalCode,
  organizationName: attributes.service.organizationName,
  requireSecureChannels: attributes.service.requireSecureChannels,
  serviceCategory: attributes.service.serviceMetadata?.category,
  serviceId: attributes.service.serviceId,
  serviceName: attributes.service.serviceName,
  serviceVersion: attributes.service.version,
});

export const CosmosUserAttributesMiddleware =
  (serviceModel: ServiceModel): UserAttributesMiddleware =>
  async (request) =>
    pipe(
      await AzureUserAttributesMiddleware(serviceModel)(request),
      E.map((attributes) => ({
        email: attributes.email,
        kind: attributes.kind,
        service: toServicesCmsDetails(attributes),
      })),
    );

export const ServicesCmsUserAttributesMiddleware =
  (client: ServicesCmsClient): UserAttributesMiddleware =>
  async (request) => {
    const email = EmailString.decode(request.header("x-user-email"));
    if (E.isLeft(email)) {
      return E.left(
        ResponseErrorInternal("Missing, empty or invalid x-user-email header"),
      );
    }

    const subscriptionId = NonEmptyString.decode(
      request.header("x-subscription-id"),
    );
    if (E.isLeft(subscriptionId)) {
      return E.left(
        ResponseErrorInternal("Missing or empty x-subscription-id header"),
      );
    }

    return pipe(
      await client.getServiceDetails(subscriptionId.right)(),
      E.map((service) => ({
        email: email.right,
        kind: "IAzureUserAttributes" as const,
        service,
      })),
      E.mapLeft(
        (
          error,
        ):
          | IResponseErrorForbiddenNotAuthorized
          | IResponseErrorInternal
          | IResponseErrorTooManyRequests => {
          switch (error.kind) {
            case "BAD_REQUEST":
            case "NOT_FOUND":
              return ResponseErrorForbiddenNotAuthorized;
            case "TOO_MANY_REQUESTS":
              return ResponseErrorTooManyRequests("Too many requests");
            default:
              return ResponseErrorInternal(
                "Unable to retrieve the service tied to the provided subscription id",
              );
          }
        },
      ),
    );
  };
