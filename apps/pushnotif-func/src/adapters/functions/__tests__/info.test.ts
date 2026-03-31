import { Database } from "@azure/cosmos";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { NotificationHubsClient } from "@azure/notification-hubs";
import { BlobService } from "azure-storage";
import { readFile } from "fs/promises";
import { afterEach, describe, expect, test, vi } from "vitest";

import { getInfoHandler } from "../info";

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

const context = new InvocationContext();
const request = {} as HttpRequest;

const makeDatabase = (id: string): Database =>
  ({
    id,
    read: vi.fn().mockResolvedValue(undefined),
  }) as unknown as Database;

const makeBlobService = (): BlobService =>
  ({
    getServiceProperties: vi.fn((callback) => {
      callback(undefined, undefined, { statusCode: 200 });
    }),
  }) as unknown as BlobService;

const makeNotificationHubClient = () =>
  new NotificationHubsClient(
    "Endpoint=sb://foo.servicebus.windows.net/;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=bar",
    "foo",
  );

describe("getInfoHandler", () => {
  const apiCosmosdb = makeDatabase("api");
  const pushCosmosdb = makeDatabase("push");

  const firstNotificationHubClient = makeNotificationHubClient();

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should return package name and version when all healthchecks succeed", async () => {
    const blobService = makeBlobService();

    vi.mocked(readFile).mockResolvedValueOnce(
      JSON.stringify({ name: "pushnotif-func", version: "2.3.4" }),
    );

    const handler = getInfoHandler(apiCosmosdb, pushCosmosdb, blobService, [
      firstNotificationHubClient,
    ]);

    vi.spyOn(
      firstNotificationHubClient,
      "deleteInstallation",
    ).mockResolvedValueOnce({});

    await expect(handler(request, context)).resolves.toEqual({
      body: JSON.stringify({
        name: "pushnotif-func",
        version: "2.3.4",
      }),
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

    expect(apiCosmosdb.read).toHaveBeenCalledOnce();
    expect(pushCosmosdb.read).toHaveBeenCalledOnce();
    expect(blobService.getServiceProperties).toHaveBeenCalledOnce();
    expect(firstNotificationHubClient.deleteInstallation).toHaveBeenCalledWith(
      "test",
    );
    expect(readFile).toHaveBeenCalledWith(
      expect.stringMatching(/package\.json$/),
      "utf-8",
    );
  });

  test("should return 500 with collected healthcheck errors and not read package.json when a healthcheck fails", async () => {
    const blobService = makeBlobService();

    const notificationHubClient = makeNotificationHubClient();

    vi.spyOn(pushCosmosdb, "read").mockRejectedValueOnce(
      new Error("Cosmos error"),
    );

    vi.spyOn(notificationHubClient, "deleteInstallation").mockRejectedValueOnce(
      new Error("Notification hub error"),
    );

    const handler = getInfoHandler(apiCosmosdb, pushCosmosdb, blobService, [
      notificationHubClient,
    ]);

    await expect(handler(request, context)).resolves.toEqual({
      body: JSON.stringify({
        errors: [
          "Cosmos Healthcheck failed for database push Error: Cosmos error",
          "Healthcheck failed for notification hub Error: Notification hub error",
        ],
      }),
      status: 500,
    });

    expect(apiCosmosdb.read).toHaveBeenCalledOnce();
    expect(pushCosmosdb.read).toHaveBeenCalledOnce();
    expect(blobService.getServiceProperties).toHaveBeenCalledOnce();
    expect(notificationHubClient.deleteInstallation).toHaveBeenCalledWith(
      "test",
    );
    expect(readFile).not.toHaveBeenCalled();
  });

  test("should return 500 when package.json cannot be read after successful healthchecks", async () => {
    const blobService = makeBlobService();

    vi.mocked(readFile).mockRejectedValueOnce(new Error("missing file"));

    const handler = getInfoHandler(apiCosmosdb, pushCosmosdb, blobService, []);

    await expect(handler(request, context)).resolves.toEqual({
      body: JSON.stringify({ error: "Could not read function info" }),
      status: 500,
    });

    expect(apiCosmosdb.read).toHaveBeenCalledOnce();
    expect(pushCosmosdb.read).toHaveBeenCalledOnce();
    expect(blobService.getServiceProperties).toHaveBeenCalledOnce();
    expect(readFile).toHaveBeenCalledOnce();
  });
});
