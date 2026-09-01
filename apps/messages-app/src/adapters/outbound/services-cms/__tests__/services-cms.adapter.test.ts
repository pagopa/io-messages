import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MalformedEntityError } from "../../../../application/ports/error.js";
import { ServicesCmsHttpClientAdapter } from "../services-cms.js";

const aServiceID = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

const aServicesAppMessageDetail = {
  authorized_cidrs: ["192.0.2.0/24"],
  authorized_recipients: ["AAABBB00A00A000A"],
  description: "A service description",
  id: aServiceID,
  last_update: "2024-01-01T00:00:00.000Z",
  max_allowed_payment_amount: 9999999999,
  metadata: {
    scope: "NATIONAL",
  },
  name: "A service name",
  organization: {
    department_name: "A department name",
    fiscal_code: "01234567890",
    name: "An organization name",
  },
  require_secure_channel: false,
  status: {
    value: "published",
  },
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

const fetchMock = vi.fn<typeof fetch>();
const trackEventMock = vi.fn();

const adapter = new ServicesCmsHttpClientAdapter(
  new URL("https://apim.example"),
  "subscription-key",
  {
    trackEvent: trackEventMock,
  } as unknown as Logger,
);

describe("getMessageDetailsByServiceIds", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse(aServicesAppMessageDetail));
    trackEventMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("returns the mapped service details for each valid service", async () => {
    const result = await adapter.getServicesCmsDetailsByServiceIds([
      aServiceID,
    ]);

    expect(result.isOk()).toBe(true);
    const detailsByServiceId = result._unsafeUnwrap();

    expect(detailsByServiceId.size).toBe(1);
    expect(detailsByServiceId.get(aServiceID)?._unsafeUnwrap()).toEqual(
      aServicesAppMessageDetail,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `https://apim.example/api/v1/internal/services/${aServiceID}`,
      {
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": "subscription-key",
        },
      },
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("reports a MalformedEntityError per-item when the service id is invalid", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ title: "Bad request" }, 400));

    const result = await adapter.getServicesCmsDetailsByServiceIds([
      aServiceID,
    ]);

    expect(result.isOk()).toBe(true);
    const entry = result._unsafeUnwrap().get(aServiceID);

    expect(entry?.isErr()).toBe(true);
    expect(entry?._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
    expect(trackEventMock).toHaveBeenCalledTimes(1);
  });

  it("reports a NotFoundError per-item when the service does not exist", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ title: "Not found" }, 404));

    const result = await adapter.getServicesCmsDetailsByServiceIds([
      aServiceID,
    ]);

    expect(result.isOk()).toBe(true);
    const entry = result._unsafeUnwrap().get(aServiceID);

    expect(entry?.isErr()).toBe(true);
    expect(entry?._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    expect(trackEventMock).toHaveBeenCalledTimes(1);
  });

  it("reports a MalformedEntityError per-item when the response is not valid JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("not-a-json", {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    const result = await adapter.getServicesCmsDetailsByServiceIds([
      aServiceID,
    ]);

    expect(result.isOk()).toBe(true);
    const entry = result._unsafeUnwrap().get(aServiceID);

    expect(entry?.isErr()).toBe(true);
    expect(entry?._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
    expect(trackEventMock).toHaveBeenCalledTimes(1);
  });

  it("reports a MalformedEntityError per-item when the response does not match the schema", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ...aServicesAppMessageDetail, name: "" }),
    );

    const result = await adapter.getServicesCmsDetailsByServiceIds([
      aServiceID,
    ]);

    expect(result.isOk()).toBe(true);
    const entry = result._unsafeUnwrap().get(aServiceID);

    expect(entry?.isErr()).toBe(true);
    expect(entry?._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
    expect(trackEventMock).toHaveBeenCalledTimes(1);
  });

  it("collects valid and skippable-error entries in the same map", async () => {
    const missingServiceID = "01ARZ3NDEKTSV4RRFFQ69G5FAW";
    fetchMock
      .mockResolvedValueOnce(jsonResponse(aServicesAppMessageDetail))
      .mockResolvedValueOnce(jsonResponse({ title: "Not found" }, 404));

    const result = await adapter.getServicesCmsDetailsByServiceIds([
      aServiceID,
      missingServiceID,
    ]);

    expect(result.isOk()).toBe(true);
    const detailsByServiceId = result._unsafeUnwrap();

    expect(detailsByServiceId.get(aServiceID)?._unsafeUnwrap()).toEqual(
      aServicesAppMessageDetail,
    );
    expect(
      detailsByServiceId.get(missingServiceID)?._unsafeUnwrapErr(),
    ).toBeInstanceOf(NotFoundError);
    expect(trackEventMock).toHaveBeenCalledTimes(1);
  });

  it("fails the whole operation with a TooManyRequestsError on throttling", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ title: "Too many requests" }, 429),
    );

    const result = await adapter.getServicesCmsDetailsByServiceIds([
      aServiceID,
    ]);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("fails the whole operation with a GenericError on unexpected response status", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ title: "Internal error" }, 500));

    const result = await adapter.getServicesCmsDetailsByServiceIds([
      aServiceID,
    ]);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("fails the whole operation with a GenericError on fetch failure", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));

    const result = await adapter.getServicesCmsDetailsByServiceIds([
      aServiceID,
    ]);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});
