import crypto from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { RegistrationDescription } from "@azure/notification-hubs";
import { RegRow, SasParams } from "./types";

export const parseConnectionString = (connStr: string) => {
  const parts = connStr.split(";").filter(Boolean);
  const map = Object.fromEntries(
    parts.map((p) => {
      const [key, ...rest] = p.split("=");
      return [key, rest.join("=")];
    }),
  );

  const endpoint = map.Endpoint?.replace(/^sb:\/\//, "").replace(/\/$/, "");
  const namespace = endpoint?.split(".")[0];

  return {
    namespace,
    keyName: map.SharedAccessKeyName,
    key: map.SharedAccessKey,
  };
};

const extractInstallationId = (tags: string[]): string | undefined => {
  const tagged = tags.find((t) => t.startsWith("$InstallationId:"));
  if (tagged) {
    const installationId = tagged.slice("$InstallationId:".length);
    const match = installationId.match(/[a-fA-F0-9]{64}/);
    if (!match) return;
    return match[0].toLowerCase();
  }
};

export const formatRow = (registration: RegistrationDescription): RegRow => {
  const registrationId = registration.registrationId;
  const installationId = extractInstallationId(registration.tags || []);
  return { registrationId, installationId };
};

export const buildSasToken = (
  resourceUri: string,
  keyName: string,
  key: string,
  ttlSeconds = 3600,
) => {
  const se = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sr = encodeURIComponent(resourceUri.toLowerCase());
  const stringToSign = `${sr}\n${se}`;
  const sig = encodeURIComponent(
    crypto
      .createHmac("sha256", key)
      .update(stringToSign, "utf8")
      .digest("base64"),
  );
  return `SharedAccessSignature sr=${sr}&sig=${sig}&se=${se}&skn=${encodeURIComponent(keyName)}`;
};

export const fetchRegistrationsPage = async (
  sas: SasParams,
  top: number = 100,
  continuationToken?: string,
) => {
  const apiVersion = "2015-01";
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });

  const resourceUri = `https://${sas.namespace}.servicebus.windows.net/${sas.hubName}/registrations/`;
  const url = new URL(resourceUri);
  url.searchParams.set("api-version", apiVersion);
  url.searchParams.set("$top", String(top));
  if (continuationToken) {
    url.searchParams.set("ContinuationToken", continuationToken);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-ms-version": apiVersion,
      Authorization: buildSasToken(resourceUri, sas.keyName, sas.key),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${body}`);
  }

  const nextToken = res.headers.get("x-ms-continuationtoken") || undefined;
  const xml = await res.text();
  const json = parser.parse(xml);

  const entriesRaw = json?.feed?.entry ?? [];
  const entries = Array.isArray(entriesRaw)
    ? entriesRaw
    : [entriesRaw].filter(Boolean);

  const rows: RegRow[] = entries.map((e: any) => {
    const content = e?.content;
    const [descKey] = Object.keys(content || {}).filter((k) =>
      k.endsWith("RegistrationDescription"),
    );
    const desc = descKey ? content[descKey] : undefined;
    const description = {
      registrationId: desc?.RegistrationId,
      tags: desc?.Tags?.split(",")
        .map((t: string) => t.trim())
        .filter(Boolean),
      platform: descKey?.replace("RegistrationDescription", "").toLowerCase(),
      pushChannel:
        desc?.DeviceToken || desc?.GcmRegistrationId || desc?.FcmRegistrationId,
      bodyTemplate: desc?.BodyTemplate,
      expiry: desc?.Expiry,
      etag: e?.["@_m:etag"] ?? e?.etag,
    };
    return {
      registrationId: description.registrationId,
      installationId: extractInstallationId(description.tags || []),
    };
  });

  return { rows, continuationToken: nextToken };
};
