import {
  Installation,
  NotificationHubsClient,
  RegistrationDescription,
} from "@azure/notification-hubs";
import "dotenv/config";

import { APNSPushType, APNSTemplate, FCMV1Template, SasParams } from "./types";
import { fetchRegistrationsPage, formatRow } from "./utils";

export const deleteInstallation = async (
  client: NotificationHubsClient,
  installationId: string,
) => {
  try {
    await client.deleteInstallation(installationId);
  } catch (error) {
    throw new Error(
      `Error deleting installation ${installationId}: ${error.message}`,
    );
  }
};

export const createInstallation = async (
  client: NotificationHubsClient,
  installation: Installation,
) => {
  try {
    await client.createOrUpdateInstallation(installation);
  } catch (error) {
    throw new Error(
      `Error creating installation ${installation.installationId}: ${error.message}`,
    );
  }
};

export const getInstallation = async (
  client: NotificationHubsClient,
  installationId: string,
): Promise<Installation | undefined> => {
  try {
    const installation = await client.getInstallation(installationId);
    return installation;
  } catch (error) {
    throw new Error(
      `Error fetching installation ${installationId}: ${error.message}`,
    );
  }
};

export const migrateInstallation = async (
  fromClient: NotificationHubsClient,
  toClient: NotificationHubsClient,
  installationId: string,
) => {
  const installation = await getInstallation(fromClient, installationId);
  if (installation) {
    // create a new installation following apps/pushnotif-func/src/utils/notification.ts 's createOrUpdateInstallation
    const newInstallation: Installation = {
      ...installation,
      templates: {
        template: {
          body:
            installation.platform.toLowerCase() === "apns"
              ? APNSTemplate
              : FCMV1Template,
          headers:
            installation.platform.toLowerCase() === "apns"
              ? {
                  ["apns-priority"]: "10",
                  ["apns-push-type"]: APNSPushType.ALERT,
                }
              : {},
          // add the installation id as a tag (pushnotif-func receives it from io-backend's request)
          tags: [installation.installationId],
        },
      },
    };
    await createInstallation(toClient, newInstallation);
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
  const rows = new Set<string>();
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

interface IExportOptions {
  exportFunction?: (rows: string[]) => Promise<void>;
  oldInstallations?: string[];
  sas: SasParams;
  token?: string;
  top?: number;
}

export const getInstallations = async ({
  exportFunction,
  oldInstallations,
  sas,
  token,
  top = 100,
}: IExportOptions) => {
  // using a set to avoid duplicates since an installation can have multiple registrations
  const installations = new Set<string>();
  // max page size supported by the rest api seems to be 100 elements
  const pageSize = Math.min(100, Math.max(1, top));
  let nextToken: string | undefined = token;

  // if we're resuming a previous run, prepopulate the set with the previously exported installations
  oldInstallations.forEach((installation) => installations.add(installation));

  const start = Date.now();

  do {
    const { continuationToken, rows } = await fetchRegistrationsPage(
      sas,
      pageSize,
      nextToken,
    );

    if (exportFunction) {
      try {
        const newInstallations = new Set<string>();
        // only export new installation, filter out the ones already in the set
        const newRows = rows.filter(
          (r) => !installations.has(r.installationId),
        );
        // create a set to avoid duplicates
        newRows.forEach((row) => newInstallations.add(row.installationId));
        if (newInstallations.size > 0) {
          await exportFunction(Array.from(newInstallations));
        }
      } catch (error) {
        //eslint-disable-next-line no-console
        console.error(`Error exporting new rows: ${error.message}`);
      }
    }

    rows.forEach((row) => installations.add(row.installationId));
    nextToken = continuationToken;

    //eslint-disable-next-line no-console
    console.log(
      `${new Date(Date.now()).toLocaleString("it-IT")} - Fetched ${rows.length} registrations, total installations: ${installations.size} out of ${top}`,
    );
    //eslint-disable-next-line no-console
    console.log(`Continuation token: ${nextToken ? nextToken : "none"}`);
  } while (nextToken && installations.size < top);

  const end = Date.now();
  const diffMs = end - start;
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  //eslint-disable-next-line no-console
  console.log(
    `Fetched ${installations.size} installations in ${minutes}m ${seconds}s`,
  );

  return { continuationToken: nextToken, rows: Array.from(installations) };
};
