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
): Promise<{ continuationToken: string | undefined; rows: RegRow[] }> => {
  const rows: RegRow[] = [];
  let continuationToken: string | undefined;
  let continueLoop = true;
  while (continueLoop) {
    const page = await pager.next();
    continuationToken = page?.value?.continuationToken;

    rows.push(...(page?.value?.map(formatRow) || []));

    continueLoop = max
      ? !(page?.done || !page?.value?.length) && rows.length <= max
      : !(page?.done || !page?.value?.length);
  }

  return {
    continuationToken,
    rows,
  };
};

export const getPagedRegistrations = async (
  sas: SasParams,
  top = 100,
  token?: string,
) => {
  const registrations: RegRow[] = [];
  const pageSize = Math.min(500, Math.max(1, top));
  let nextToken: string | undefined = token;

  do {
    const { continuationToken, rows } = await fetchRegistrationsPage(
      sas,
      pageSize,
      token,
    );

    registrations.push(...rows);
    nextToken = continuationToken;
  } while (nextToken && registrations.length < top);

  return { continuationToken: nextToken, rows: registrations };
};
