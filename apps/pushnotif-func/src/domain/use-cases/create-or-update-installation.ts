import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { KindEnum } from "../../generated/notifications/CreateOrUpdateInstallationMessage";
import { PlatformEnum } from "../../generated/notifications/Platform";
import { toHash } from "../../utils/crypto";
import {
  CreateOrUpdateInstallation,
  CreateOrUpdateInstallationRepository,
} from "../installation";

export class CreateOrUpdateInstallationUseCase {
  constructor(
    private readonly repository: CreateOrUpdateInstallationRepository,
  ) {}

  execute(fiscalCode: FiscalCode, installation: CreateOrUpdateInstallation) {
    const fiscalCodeHash = toHash(fiscalCode) as NonEmptyString;

    return this.repository.createOrUpdateInstallation({
      installationId: fiscalCodeHash,
      kind: KindEnum.CreateOrUpdateInstallation,
      platform:
        installation.platform === "apns"
          ? PlatformEnum.apns
          : PlatformEnum.fcmv1,
      pushChannel: installation.pushChannel,
      tags: [fiscalCodeHash],
    });
  }
}
