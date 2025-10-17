#!/usr/bin/env ts-node

import { program } from "commander";
import {
  NotificationHubJob,
  NotificationHubJobPoller,
  NotificationHubsClient,
} from "@azure/notification-hubs";
import {
  BlobServiceClient,
  ContainerSASPermissions,
  SASProtocol,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

/**
 * Util
 */
const required = (name: string, val?: string) => {
  if (!val) throw new Error(`Missing required ${name}`);
  return val;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * CREA SAS DI CONTAINER (rlwc = read+list+write+create)
 */
async function makeContainerSasUrl(opts: {
  accountName: string;
  accountKey: string;
  blobEndpoint: string; // es: https://<account>.blob.core.windows.net
  containerName: string;
  expiresInHours?: number;
}): Promise<string> {
  const { accountName, accountKey, blobEndpoint, containerName } = opts;
  const cred = new StorageSharedKeyCredential(accountName, accountKey);
  const svc = new BlobServiceClient(blobEndpoint, cred);
  const container = svc.getContainerClient(containerName);
  await container.createIfNotExists();

  const startsOn = new Date(Date.now() - 5 * 60 * 1000);
  const expiresOn = new Date(
    Date.now() + (opts.expiresInHours ?? 24) * 60 * 60 * 1000,
  );

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      permissions: ContainerSASPermissions.parse("rlwc"),
      protocol: SASProtocol.Https,
      startsOn,
      expiresOn,
    },
    cred,
  ).toString();

  return `${container.url}?${sas}`;
}

/**
 * POLLING STATO JOB
 */
async function waitForJobCompletion(
  client: NotificationHubsClient,
  job: NotificationHubJob,
  { intervalMs = 5000, timeoutMs = 30 * 60 * 1000 } = {},
): Promise<NotificationHubJob> {
  const start = Date.now();
  let current = job;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Job ${job.jobId} timed out after ${timeoutMs / 1000}s`);
    }

    try {
      current = await client.getNotificationHubJob(current.jobId!);
    } catch (error) {
      console.error(
        `Error while polling for job ${current.jobId}: ${error.message}`,
      );
      throw error;
    }

    if (current.status === "Completed") return current;
    if (current.status === "Failed") {
      throw new Error(
        `Job ${current.jobId} failed${current.outputContainerUrl ? ` (output: ${current.outputContainerUrl})` : ""}`,
      );
    }

    await sleep(intervalMs);
  }
}

/**
 * EXPORT: crea un job ExportRegistrations verso un container SAS.
 * Ritorna la URL SAS del container che conterrà il file di export.
 */
async function runExport(opts: {
  connectionString: string;
  hubName: string;
  outputContainerSasUrl: string;
}) {
  try {
    const client = new NotificationHubsClient(
      opts.connectionString,
      opts.hubName,
    );
    const job = await client.submitNotificationHubJob({
      type: "ExportRegistrations",
      outputContainerUrl: opts.outputContainerSasUrl,
    });

    const done = await waitForJobCompletion(client, job);
    return done; // done.outputContainerUrl conterrà i risultati
  } catch (error) {
    console.log(`Error on Job ImportUpsertRegistrations: ${error.message}`);
  }
}

/**
 * IMPORT: crea un job ImportRegistrations leggendo un file dal container SAS.
 * Di solito il file di export è "registrations.txt" (o .zip). Manteniamo il nome parametrico.
 */
async function runImport(opts: {
  connectionString: string;
  hubName: string;
  importFileUrl: string; // SAS URL del blob singolo (es: .../registrations.txt?<sas>)
  outputContainerSasUrl: string;
}) {
  const client = new NotificationHubsClient(
    opts.connectionString,
    opts.hubName,
  );
  try {
    const job = await client.submitNotificationHubJob({
      type: "ImportUpsertRegistrations",
      importFileUrl: opts.importFileUrl,
      outputContainerUrl: opts.outputContainerSasUrl,
    });

    const done = await waitForJobCompletion(client, job);
    return done;
  } catch (error) {
    console.log(`Error on Job ImportUpsertRegistrations: ${error.message}`);
  }
}

/**
 * Helper: costruisce la SAS del BLOB del file dentro al container SAS (aggiungendo /<file> alla URL).
 * Nota: la SAS del *container* è sufficiente per l’import; molti scenari accettano direttamente la URL
 * del singolo blob costruita manualmente perché la query SAS è identica.
 */
function buildBlobUrlFromContainer(containerSasUrl: string, blobName: string) {
  const url = new URL(containerSasUrl);
  // rimuovo eventuale slash finale dal path
  url.pathname = url.pathname.replace(/\/$/, "");
  url.pathname = `${url.pathname}/${blobName}`;
  return url.toString();
}

program
  .command("export")
  .requiredOption(
    "--source-conn <conn>",
    "Connection string del Notification Hub sorgente",
  )
  .requiredOption("--source-hub <hub>", "Nome del Notification Hub sorgente")
  .requiredOption(
    "--blob-endpoint <url>",
    "Blob endpoint, es: https://<account>.blob.core.windows.net",
  )
  .requiredOption("--account-name <name>", "Storage account name")
  .requiredOption("--account-key <key>", "Storage account key")
  .requiredOption("--container <name>", "Nome container destinazione export")
  .option("--expires <hours>", "Scadenza SAS in ore (default 24)", "24")
  .action(async (cmd) => {
    try {
      const containerSas = await makeContainerSasUrl({
        accountName: required("account-name", cmd.accountName),
        accountKey: required("account-key", cmd.accountKey),
        blobEndpoint: required("blob-endpoint", cmd.blobEndpoint),
        containerName: required("container", cmd.container),
        expiresInHours: parseInt(cmd.expires, 10),
      });

      const res = await runExport({
        connectionString: required("source-conn", cmd.sourceConn),
        hubName: required("source-hub", cmd.sourceHub),
        outputContainerSasUrl: containerSas,
      });

      // L’export normalmente crea un blob "registrations.txt" o compresso.
      console.log("Export completato.");
      console.log("Output container SAS:", containerSas);
      console.log(
        "Esempio blob (ipotizzato):",
        buildBlobUrlFromContainer(containerSas, "Output.txt"),
      );
    } catch (e: any) {
      console.error("Errore durante export:", e.message ?? e);
      process.exit(1);
    }
  });

program
  .command("import")
  .requiredOption(
    "--dest-conn <conn>",
    "Connection string del Notification Hub di destinazione",
  )
  .requiredOption(
    "--dest-hub <hub>",
    "Nome del Notification Hub di destinazione",
  )
  .requiredOption(
    "--import-url <sas>",
    "SAS URL del blob da importare (es: .../registrations.txt?<sas>)",
  )
  .requiredOption(
    "--blob-endpoint <url>",
    "Blob endpoint, es: https://<account>.blob.core.windows.net",
  )
  .requiredOption("--account-name <name>", "Storage account name")
  .requiredOption("--account-key <key>", "Storage account key")
  .requiredOption("--container <name>", "Nome container appoggio")
  .action(async (cmd) => {
    try {
      const containerSas = await makeContainerSasUrl({
        accountName: required("account-name", cmd.accountName),
        accountKey: required("account-key", cmd.accountKey),
        blobEndpoint: required("blob-endpoint", cmd.blobEndpoint),
        containerName: required("container", cmd.container),
        expiresInHours: parseInt(cmd.expires, 10),
      });

      const importFileUrlSas = await makeContainerSasUrl({
        accountName: required("account-name", cmd.accountName),
        accountKey: required("account-key", cmd.accountKey),
        blobEndpoint: required("import-url", cmd.importUrl),
        containerName: required("container", cmd.container),
        expiresInHours: parseInt(cmd.expires, 10),
      });

      const res = await runImport({
        connectionString: required("dest-conn", cmd.destConn),
        hubName: required("dest-hub", cmd.destHub),
        importFileUrl: importFileUrlSas,
        outputContainerSasUrl: containerSas,
      });

      console.log("Import completato.");
      // if (res.outputContainerUrl) {
      //   console.log("Output/diagnostica:", res.outputContainerUrl);
      // }
    } catch (e: any) {
      console.error("Errore durante import:", e.message ?? e);
      process.exit(1);
    }
  });

program
  .command("migrate")
  .description(
    "Esegue export dal sorgente e import sul destinatario in un colpo solo",
  )
  .requiredOption(
    "--source-conn <conn>",
    "Connection string del Notification Hub sorgente",
  )
  .requiredOption("--source-hub <hub>", "Nome del Notification Hub sorgente")
  .requiredOption(
    "--dest-conn <conn>",
    "Connection string del Notification Hub di destinazione",
  )
  .requiredOption(
    "--dest-hub <hub>",
    "Nome del Notification Hub di destinazione",
  )
  .requiredOption(
    "--blob-endpoint <url>",
    "Blob endpoint, es: https://<account>.blob.core.windows.net",
  )
  .requiredOption("--account-name <name>", "Storage account name")
  .requiredOption("--account-key <key>", "Storage account key")
  .requiredOption("--container <name>", "Nome container appoggio")
  .option("--blob-name <name>", "Nome file di export atteso", "Output.txt")
  .option("--expires <hours>", "Scadenza SAS in ore (default 24)", "24")
  .action(async (cmd) => {
    try {
      const containerSas = await makeContainerSasUrl({
        accountName: required("account-name", cmd.accountName),
        accountKey: required("account-key", cmd.accountKey),
        blobEndpoint: required("blob-endpoint", cmd.blobEndpoint),
        containerName: required("container", cmd.container),
        expiresInHours: parseInt(cmd.expires, 10),
      });

      const exportJob = await runExport({
        connectionString: required("source-conn", cmd.sourceConn),
        hubName: required("source-hub", cmd.sourceHub),
        outputContainerSasUrl: containerSas,
      });

      const blobUrl = buildBlobUrlFromContainer(containerSas, cmd.blobName);

      const importJob = await runImport({
        connectionString: required("dest-conn", cmd.destConn),
        hubName: required("dest-hub", cmd.destHub),
        importFileUrl: blobUrl,
        outputContainerSasUrl: containerSas,
      });

      console.log("Migrazione completata.");
      // if (exportJob.outputContainerUrl)
      //   console.log("Export output:", exportJob.outputContainerUrl);
      // if (importJob.outputContainerUrl)
      //   console.log("Import output:", importJob.outputContainerUrl);
    } catch (e: any) {
      console.error("Errore durante migrate:", e.message ?? e);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
