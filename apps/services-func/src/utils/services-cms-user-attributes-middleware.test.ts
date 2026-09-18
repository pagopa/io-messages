import type {
  ServicesCmsClient,
  ServicesCmsServiceDetails,
} from "@/clients/services-cms";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { describe, expect, it, vi } from "vitest";

import { ServicesCmsUserAttributesMiddleware } from "./services-cms-user-attributes-middleware";

const requestWithHeaders = (headers: Record<string, string | undefined>) =>
  ({ header: (name: string) => headers[name] }) as Parameters<
    ReturnType<typeof ServicesCmsUserAttributesMiddleware>
  >[0];

const service: ServicesCmsServiceDetails = {
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
    const middleware = ServicesCmsUserAttributesMiddleware({
      getServiceDetails: vi.fn(),
    } as unknown as ServicesCmsClient);

    const result = await middleware(
      requestWithHeaders({ "x-subscription-id": "service-id" }),
    );

    expect(E.isLeft(result) && result.left.kind).toBe("IResponseErrorInternal");
  });

  it("returns forbidden when the service is missing", async () => {
    const middleware = ServicesCmsUserAttributesMiddleware({
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
    const middleware = ServicesCmsUserAttributesMiddleware({
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
