import type { UseCase } from "@pagopa/hexagonal-core";

import { ok } from "neverthrow";

interface InfoOutput {
  readonly name: string;
  readonly version: string;
}

export const getInfoUseCase: UseCase<
  Record<string, never>,
  InfoOutput,
  never
> = async () =>
  // TODO: Get those infos from the package.json
  ok({
    name: "messages-app",
    version: "0.0.1",
  });
