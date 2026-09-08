import { HttpRequest, InvocationContext } from "@azure/functions";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal } from "../../../domain/error";
import { CreateOrUpdateInstallationUseCase } from "../../../domain/use-cases/create-or-update-installation";
import { getCreateOrUpdateInstallationHandler } from "../create-or-update-installation";

const fiscalCode = "RSSMRA80A01H501U";
const validUserHeader = Buffer.from(
  JSON.stringify({ fiscal_code: fiscalCode }),
).toString("base64");
const validBody = { platform: "fcmv1", pushChannel: "push-channel" };
const context = new InvocationContext();
const useCaseMock: Pick<CreateOrUpdateInstallationUseCase, "execute"> = {
  execute: vi.fn(),
};
const handler = getCreateOrUpdateInstallationHandler(
  useCaseMock as CreateOrUpdateInstallationUseCase,
);

const makeRequest = ({
  body = validBody,
  id = "client-installation-id",
  userHeader = validUserHeader,
}: {
  body?: unknown;
  id?: string;
  userHeader?: null | string;
} = {}) =>
  new HttpRequest({
    body: { string: JSON.stringify(body) },
    headers: userHeader === null ? {} : { "x-user": userHeader },
    method: "PUT",
    params: { id },
    url: `http://localhost/api/communication/v1/installations/${id}`,
  });

const responseBody = async (response: Response) =>
  JSON.parse(await response.text()) as unknown;

describe("getCreateOrUpdateInstallationHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 200 after enqueuing a valid installation", async () => {
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce("message-id");

    const response = (await handler(makeRequest(), context)) as Response;

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({ message: "ok" });
    expect(useCaseMock.execute).toHaveBeenCalledWith(fiscalCode, validBody);
  });

  test.each([
    ["missing", null],
    ["invalid base64", "%%%"],
    ["invalid json", Buffer.from("not-json").toString("base64")],
    [
      "invalid fiscal code",
      Buffer.from(JSON.stringify({ fiscal_code: "invalid" })).toString(
        "base64",
      ),
    ],
  ])("returns 401 for %s x-user", async (_case, userHeader) => {
    const response = (await handler(
      makeRequest({ userHeader }),
      context,
    )) as Response;

    expect(response.status).toBe(401);
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  test("returns 400 for an empty installation id", async () => {
    const response = (await handler(
      makeRequest({ id: "" }),
      context,
    )) as Response;

    expect(response.status).toBe(400);
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  test.each([
    { platform: "gcm", pushChannel: "push-channel" },
    { platform: "APNS", pushChannel: "push-channel" },
    { platform: "apns" },
  ])("returns 400 for invalid body $platform", async (body) => {
    const response = (await handler(
      makeRequest({ body }),
      context,
    )) as Response;

    expect(response.status).toBe(400);
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  test("returns 500 when enqueueing fails", async () => {
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(
      new ErrorInternal("Failed to enqueue installation update"),
    );

    const response = (await handler(makeRequest(), context)) as Response;

    expect(response.status).toBe(500);
    await expect(responseBody(response)).resolves.toEqual({
      error: "Failed to enqueue installation update",
    });
  });
});
