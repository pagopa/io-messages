import "dotenv/config";
import {
  NotificationHubsClient,
  RegistrationDescription,
} from "@azure/notification-hubs";
import { RegRow, SasParams } from "./types";
import { formatRow, fetchRegistrationsPage } from "./utils";

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
): Promise<{ rows: RegRow[]; continuationToken: string | undefined }> => {
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
    rows,
    continuationToken,
  };
};

export const getPagedRegistrations = async (
  sas: SasParams,
  top: number = 100,
  token?: string,
) => {
  const registrations: RegRow[] = [];
  const pageSize = Math.min(500, Math.max(1, top));
  let nextToken: string | undefined = token;

  do {
    const { rows, continuationToken } = await fetchRegistrationsPage(
      sas,
      pageSize,
      token,
    );

    registrations.push(...rows);
    nextToken = continuationToken;
  } while (nextToken && registrations.length < top);

  return { rows: registrations, continuationToken: nextToken };
};
