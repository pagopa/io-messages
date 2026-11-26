import type { GenericError, UseCase } from "@pagopa/hexagonal-core";

import type { AppInfo, AppInfoReader } from "../ports/app-info.js";

export type GetInfoUseCase = UseCase<
  Record<string, never>,
  AppInfo,
  GenericError
>;

export const makeGetInfoUseCase =
  (appInfoReader: AppInfoReader): GetInfoUseCase =>
  async () =>
    appInfoReader.getAppInfo();
