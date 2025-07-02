import { FiscalCode } from "@pagopa/io-functions-commons/dist/generated/definitions/FiscalCode";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";

import { initTelemetryClient } from "./appinsights";
import { toHash } from "./crypto";

export const createTracker = (
  telemetryClient: ReturnType<typeof initTelemetryClient>,
) => {
  const trackEnrichmentFailure = (
    kind: "CONTENT" | "SERVICE" | "STATUS",
    fiscalCode: FiscalCode,
    messageId?: string,
    serviceId?: ServiceId,
  ) => {
    telemetryClient?.trackEvent({
      name: "messages.enrichMessages.failure",
      properties: {
        fiscalCode: toHash(fiscalCode),
        kind,
        messageId,
        serviceId,
      },
      tagOverrides: { samplingEnabled: "false" },
    });
  };
  return {
    messages: {
      trackEnrichmentFailure,
    },
  };
};
