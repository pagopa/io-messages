import {
  Installation,
  NotificationHubsClient,
  RegistrationDescription,
} from "@azure/notification-hubs";
import "dotenv/config";

import {
  APNSPushType,
  APNSTemplate,
  FCMV1Template,
  RegRow,
  SasParams,
} from "./types";
import { fetchRegistrationsPage, formatRow } from "./utils";

export const migrateInstallation = async (
  fromClient: NotificationHubsClient,
  toClient: NotificationHubsClient,
  installationId: string,
) => {
  const installation = await fromClient.getInstallation(installationId);
  if (installation) {
    const newInstallation: Installation = {
      ...installation,
      templates: {
        template: {
          body:
            installation?.platform === "apns" ? APNSTemplate : FCMV1Template,
          headers:
            installation?.platform === "apns"
              ? {
                  ["apns-priority"]: "10",
                  ["apns-push-type"]: APNSPushType.ALERT,
                }
              : {},
          tags: [],
        },
      },
    };
    await toClient.createOrUpdateInstallation(newInstallation);
  }
};

export const getPager = (
  client: NotificationHubsClient,
  pageSize: number,
): AsyncIterableIterator<RegistrationDescription[]> => {
  const pager = client.listRegistrations({ top: pageSize }).byPage();

  return pager;
};

export const getRegistrations = async (
  pager: AsyncIterableIterator<RegistrationDescription[]>,
  max?: number,
): Promise<{ continuationToken: string | undefined; rows: string[] }> => {
  const rows: Set<string> = new Set();
  let continuationToken: string | undefined;
  let continueLoop = true;
  while (continueLoop) {
    const page = await pager.next();
    continuationToken = page?.value?.continuationToken;

    page?.value?.forEach((row) => rows.add(formatRow(row).installationId));

    continueLoop = max
      ? !(page?.done || !page?.value?.length) && rows.size <= max
      : !(page?.done || !page?.value?.length);
  }

  return {
    continuationToken,
    rows: Array.from(rows),
  };
};

export const getPagedRegistrations = async (
  sas: SasParams,
  top = 100,
  token?: string,
) => {
  const installation: Set<string> = new Set();
  const pageSize = Math.min(100, Math.max(1, top));
  let nextToken: string | undefined = token;

  const start = Date.now();

  do {
    const { continuationToken, rows } = await fetchRegistrationsPage(
      sas,
      pageSize,
      nextToken,
    );

    rows.forEach((row) => installation.add(row.installationId));
    nextToken = continuationToken;

    //eslint-disable-next-line no-console
    console.log(
      `${new Date(Date.now()).toLocaleString("it-IT")} - Fetched ${rows.length} registrations, total installations: ${installation.size} out of ${top}`,
    );
  } while (nextToken && installation.size < top);

  const end = Date.now();
  const diffMs = end - start;
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  //eslint-disable-next-line no-console
  console.log(
    `Fetched ${installation.size} installations in ${minutes}m ${seconds}s`,
  );

  return { continuationToken: nextToken, rows: Array.from(installation) };
};
