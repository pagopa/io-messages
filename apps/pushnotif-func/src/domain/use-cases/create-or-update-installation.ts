import { FiscalCode, GenericError, UseCase } from "@pagopa/hexagonal-core";

import { toHash } from "../../utils/crypto";
import {
  CreateOrUpdateInstallation,
  CreateOrUpdateInstallationRepository,
  createOrUpdateInstallationMessageSchema,
} from "../installation";

export type CreateOrUpdateInstallationUseCase = UseCase<
  {
    fiscalCode: FiscalCode;
    installation: CreateOrUpdateInstallation;
  },
  string,
  GenericError
>;

export const makeCreateOrUpdateInstallationUseCase =
  (
    repository: CreateOrUpdateInstallationRepository,
  ): CreateOrUpdateInstallationUseCase =>
  async ({ fiscalCode, installation }) => {
    const fiscalCodeHash = toHash(fiscalCode);
    const message = createOrUpdateInstallationMessageSchema.parse({
      installationId: fiscalCodeHash,
      kind: "CreateOrUpdateInstallation",
      platform: installation.platform,
      pushChannel: installation.pushChannel,
      tags: [fiscalCodeHash],
    });

    return repository.createOrUpdateInstallation(message);
  };
