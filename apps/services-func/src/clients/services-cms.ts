import { CIDR } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/CIDR";
import { OrganizationFiscalCode } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/OrganizationFiscalCode";
import { ServiceCategory } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/ServiceCategory";
import { agent } from "@pagopa/ts-commons";
import {
  AbortableFetch,
  setFetchTimeout,
  toFetch,
} from "@pagopa/ts-commons/lib/fetch";
import { WithinRangeInteger } from "@pagopa/ts-commons/lib/numbers";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { Millisecond } from "@pagopa/ts-commons/lib/units";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import nodeFetch from "node-fetch";

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

const responseCodec = t.type({
  authorized_cidrs: t.readonlyArray(CIDR),
  authorized_recipients: t.readonlyArray(FiscalCode),
  id: NonEmptyString,
  max_allowed_payment_amount: WithinRangeInteger(0, 9999999999),
  metadata: t.partial({
    category: ServiceCategory,
  }),
  name: NonEmptyString,
  organization: t.type({
    fiscal_code: OrganizationFiscalCode,
    name: NonEmptyString,
  }),
  require_secure_channel: t.boolean,
});

type ServicesCmsResponse = t.TypeOf<typeof responseCodec>;

export interface ServicesCmsServiceDetails {
  readonly authorizedCIDRs: ReadonlySet<CIDR>;
  readonly authorizedRecipients: ReadonlySet<FiscalCode>;
  readonly maxAllowedPaymentAmount: ServicesCmsResponse["max_allowed_payment_amount"];
  readonly organizationFiscalCode: OrganizationFiscalCode;
  readonly organizationName: NonEmptyString;
  readonly requireSecureChannels: boolean;
  readonly serviceCategory: ServiceCategory | undefined;
  readonly serviceId: NonEmptyString;
  readonly serviceName: NonEmptyString;
}

export type ServicesCmsClientError =
  | {
      readonly kind: "BAD_REQUEST";
    }
  | {
      readonly kind: "INVALID_RESPONSE";
      readonly reason: string;
    }
  | {
      readonly kind: "NOT_FOUND";
    }
  | {
      readonly kind: "REQUEST_ERROR";
      readonly reason: string;
    }
  | {
      readonly kind: "TOO_MANY_REQUESTS";
    }
  | {
      readonly kind: "UNEXPECTED_RESPONSE";
      readonly status: number;
    };

export interface ServicesCmsClient {
  readonly getServiceDetails: (
    serviceId: NonEmptyString,
  ) => TE.TaskEither<ServicesCmsClientError, ServicesCmsServiceDetails>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fetchWithTimeout = toFetch(
  setFetchTimeout(
    DEFAULT_REQUEST_TIMEOUT_MS as Millisecond,
    AbortableFetch(agent.getHttpsFetch(process.env)),
  ),
);
type FetchApi = typeof fetchWithTimeout;

const defaultFetchApi: FetchApi = nodeFetch as unknown as FetchApi;

const toServiceDetails = (
  response: ServicesCmsResponse,
): ServicesCmsServiceDetails => ({
  authorizedCIDRs: new Set(response.authorized_cidrs),
  authorizedRecipients: new Set(response.authorized_recipients),
  maxAllowedPaymentAmount: response.max_allowed_payment_amount,
  organizationFiscalCode: response.organization.fiscal_code,
  organizationName: response.organization.name,
  requireSecureChannels: response.require_secure_channel,
  serviceCategory: response.metadata.category,
  serviceId: response.id,
  serviceName: response.name,
});

const getServiceDetailsUrl = (
  baseUrl: string,
  serviceId: NonEmptyString,
): string => {
  const serviceDetailsUrl = new URL(baseUrl);
  serviceDetailsUrl.pathname = `${serviceDetailsUrl.pathname.replace(/\/$/, "")}/api/v1/internal/services/${serviceId}`;
  return serviceDetailsUrl.toString();
};

export const makeServicesCmsClient = (
  baseUrl: string,
  subscriptionKey: string,
  fetchApi: FetchApi = defaultFetchApi,
): ServicesCmsClient => ({
  getServiceDetails: (serviceId) =>
    pipe(
      TE.tryCatch(
        () =>
          fetchApi(getServiceDetailsUrl(baseUrl, serviceId), {
            headers: {
              "Ocp-Apim-Subscription-Key": subscriptionKey,
            },
          }),
        (reason) => ({
          kind: "REQUEST_ERROR" as const,
          reason: String(reason),
        }),
      ),
      TE.chainW(
        (
          response,
        ): TE.TaskEither<ServicesCmsClientError, ServicesCmsServiceDetails> => {
          switch (response.status) {
            case 200:
              return pipe(
                TE.tryCatch(
                  () => response.json(),
                  () => ({
                    kind: "INVALID_RESPONSE" as const,
                    reason: "Response body is not valid JSON",
                  }),
                ),
                TE.chainEitherKW((body) =>
                  pipe(
                    responseCodec.decode(body),
                    E.mapLeft((errors) => ({
                      kind: "INVALID_RESPONSE" as const,
                      reason: errors
                        .map((error) =>
                          error.context.map(({ key }) => key).join("."),
                        )
                        .join(", "),
                    })),
                  ),
                ),
                TE.map(toServiceDetails),
              );
            case 400:
              return TE.left({ kind: "BAD_REQUEST" as const });
            case 404:
              return TE.left({ kind: "NOT_FOUND" as const });
            case 429:
              return TE.left({ kind: "TOO_MANY_REQUESTS" as const });
            default:
              return TE.left({
                kind: "UNEXPECTED_RESPONSE" as const,
                status: response.status,
              });
          }
        },
      ),
    ),
});
