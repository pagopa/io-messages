import { FiscalCode } from "@pagopa/hexagonal-core";
import { ok } from "neverthrow";
import { describe, expect, test, vi } from "vitest";

import { CreateOrUpdateInstallationRepository } from "../../installation";
import { makeCreateOrUpdateInstallationUseCase } from "../create-or-update-installation";

const fiscalCode = "RSSMRA80A01H501U" as FiscalCode;
const fiscalCodeHash =
  "82e98709e2f96efd33bed69e81ab7e25e2f363dd804e4014c46f36b9805bff6e";

describe("CreateOrUpdateInstallationUseCase", () => {
  test("maps the installation to the notification queue message", async () => {
    const repository: CreateOrUpdateInstallationRepository = {
      createOrUpdateInstallation: vi.fn().mockResolvedValue(ok("message-id")),
    };
    const useCase = makeCreateOrUpdateInstallationUseCase(repository);

    await expect(
      useCase({
        fiscalCode,
        installation: {
          platform: "fcmv1",
          pushChannel: "push-channel",
        },
      }),
    ).resolves.toEqual(ok("message-id"));

    expect(repository.createOrUpdateInstallation).toHaveBeenCalledWith({
      installationId: fiscalCodeHash,
      kind: "CreateOrUpdateInstallation",
      platform: "fcmv1",
      pushChannel: "push-channel",
      tags: [fiscalCodeHash],
    });
  });
});
