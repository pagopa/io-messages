import { HttpHandler } from "@azure/functions";
import { FiscalCode, FiscalCodeSchema } from "@pagopa/hexagonal-core";
import { Result, err, ok } from "neverthrow";

import { ErrorValidation } from "../../domain/error";
import {
  createHttpResponse,
  parseHttpRequestBody,
} from "../../domain/http-request";
import {
  createOrUpdateInstallationSchema,
  installationIdSchema,
} from "../../domain/installation";
import { CreateOrUpdateInstallationUseCase } from "../../domain/use-cases/create-or-update-installation";

const getFiscalCode = (
  userHeader: null | string,
): Result<FiscalCode, ErrorValidation> => {
  if (!userHeader) {
    return err(new ErrorValidation("Missing x-user header"));
  }

  try {
    const user = JSON.parse(
      Buffer.from(userHeader, "base64").toString("utf8"),
    ) as unknown;
    const fiscalCode = FiscalCodeSchema.safeParse(
      typeof user === "object" && user !== null && "fiscal_code" in user
        ? user.fiscal_code
        : undefined,
    );

    return fiscalCode.success
      ? ok(fiscalCode.data)
      : err(new ErrorValidation("Invalid x-user header"));
  } catch {
    return err(new ErrorValidation("Invalid x-user header"));
  }
};

export const getCreateOrUpdateInstallationHandler =
  (useCase: CreateOrUpdateInstallationUseCase): HttpHandler =>
  async (request) => {
    const fiscalCodeResult = getFiscalCode(request.headers.get("x-user"));
    if (fiscalCodeResult.isErr()) {
      return createHttpResponse(401, {
        error: fiscalCodeResult.error.message,
      });
    }

    const installationId = installationIdSchema.safeParse(request.params.id);
    if (!installationId.success) {
      return createHttpResponse(400, { error: "Invalid installation id" });
    }

    const installation = await parseHttpRequestBody(
      request,
      createOrUpdateInstallationSchema,
    );
    if (installation instanceof ErrorValidation) {
      return createHttpResponse(400, {
        error: installation.message,
        issues: installation.issues,
      });
    }

    const result = await useCase({
      fiscalCode: fiscalCodeResult.value,
      installation,
    });
    if (result.isErr()) {
      return createHttpResponse(500, { error: result.error.message });
    }

    return createHttpResponse(200, { message: "ok" });
  };
