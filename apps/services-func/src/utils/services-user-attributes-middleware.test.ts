import type {
  ServicesCmsClient,
  ServicesCmsServiceDetails,
} from "@/clients/services";
import type { ServiceModel } from "@pagopa/io-functions-commons/dist/src/models/service";
import type { IAzureUserAttributes } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_user_attributes";

import { AzureUserAttributesMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_user_attributes";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { describe, expect, it, vi } from "vitest";

import {
  CosmosUserAttributesMiddleware,
  ServicesUserAttributesMiddleware,
} from "./services-user-attributes-middleware";

vi.mock(
  "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_user_attributes",
  () => ({ AzureUserAttributesMiddleware: vi.fn() }),
);

const requestWithHeaders = (headers: Record<string, string | undefined>) =>
  ({ header: (name: string) => headers[name] }) as Parameters<
    ReturnType<typeof ServicesUserAttributesMiddleware>
  >[0];

const service: ServicesCmsServiceDetails = {
  age: { max: 65, min: 18 },
  authorizedCIDRs: new Set(),
  authorizedRecipients: new Set(),
  maxAllowedPaymentAmount:
    1000 as ServicesCmsServiceDetails["maxAllowedPaymentAmount"],
  organizationFiscalCode:
    "01234567890" as ServicesCmsServiceDetails["organizationFiscalCode"],
  organizationName: "Organization" as NonEmptyString,
  requireSecureChannels: false,
  serviceCategory: undefined,
  serviceId: "service-id" as NonEmptyString,
  serviceName: "Service" as NonEmptyString,
};

describe("ServicesCmsUserAttributesMiddleware", () => {
  it("returns internal error when x-user-email is invalid", async () => {
    const middleware = ServicesUserAttributesMiddleware({
      getServiceDetails: vi.fn(),
    } as unknown as ServicesCmsClient);

    const result = await middleware(
      requestWithHeaders({ "x-subscription-id": "service-id" }),
    );

    expect(E.isLeft(result) && result.left.kind).toBe("IResponseErrorInternal");
  });

  it("returns forbidden when the service is missing", async () => {
    const middleware = ServicesUserAttributesMiddleware({
      getServiceDetails: () => TE.left({ kind: "NOT_FOUND" }),
    });

    const result = await middleware(
      requestWithHeaders({
        "x-subscription-id": "service-id",
        "x-user-email": "service@example.com",
      }),
    );

    expect(E.isLeft(result) && result.left.kind).toBe(
      "IResponseErrorForbiddenNotAuthorized",
    );
  });

  it("returns the API service details with the user email", async () => {
    const middleware = ServicesUserAttributesMiddleware({
      getServiceDetails: () => TE.right(service),
    });

    const result = await middleware(
      requestWithHeaders({
        "x-subscription-id": "service-id",
        "x-user-email": "service@example.com",
      }),
    );

    expect(E.isRight(result) && result.right).toMatchObject({
      email: "service@example.com",
      kind: "IAzureUserAttributes",
      service,
    });
  });
});

describe("CosmosUserAttributesMiddleware", () => {
  it("maps legacy service details to the shared shape", async () => {
    const attributes = {
      email: "service@example.com",
      kind: "IAzureUserAttributes",
      service: {
        ...service,
        departmentName: "Department",
        serviceMetadata: { category: "STANDARD" },
        version: 1,
      },
    } as unknown as IAzureUserAttributes;
    vi.mocked(AzureUserAttributesMiddleware).mockReturnValue(async () =>
      E.right(attributes),
    );

    const middleware = CosmosUserAttributesMiddleware({} as ServiceModel);

    const result = await middleware(requestWithHeaders({}));

    expect(E.isRight(result) && result.right).toMatchObject({
      email: "service@example.com",
      kind: "IAzureUserAttributes",
      service: {
        authorizedCIDRs: service.authorizedCIDRs,
        authorizedRecipients: service.authorizedRecipients,
        departmentName: "Department",
        maxAllowedPaymentAmount: service.maxAllowedPaymentAmount,
        organizationFiscalCode: service.organizationFiscalCode,
        organizationName: service.organizationName,
        requireSecureChannels: service.requireSecureChannels,
        serviceCategory: "STANDARD",
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        serviceVersion: 1,
      },
    });
    expect(E.isRight(result) && result.right.service).not.toHaveProperty("age");
  });
});
