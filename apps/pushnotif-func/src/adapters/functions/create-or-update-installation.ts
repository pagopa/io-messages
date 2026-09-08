import { HttpHandler } from "@azure/functions";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";

import { ErrorInternal, ErrorValidation } from "../../domain/error";
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
): ErrorValidation | FiscalCode => {
  if (!userHeader) {
    return new ErrorValidation("Missing x-user header");
  }

  try {
    const user = JSON.parse(
      Buffer.from(userHeader, "base64").toString("utf8"),
    ) as unknown;
    const fiscalCode =
      typeof user === "object" && user !== null && "fiscal_code" in user
        ? FiscalCode.decode(user.fiscal_code)
        : FiscalCode.decode(undefined);

    return E.isRight(fiscalCode)
      ? fiscalCode.right
      : new ErrorValidation("Invalid x-user header");
  } catch {
    return new ErrorValidation("Invalid x-user header");
  }
};

export const getCreateOrUpdateInstallationHandler =
  (useCase: CreateOrUpdateInstallationUseCase): HttpHandler =>
  async (request) => {
    const fiscalCode = getFiscalCode(request.headers.get("x-user"));
    if (fiscalCode instanceof ErrorValidation) {
      return createHttpResponse(401, { error: fiscalCode.message });
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

    const result = await useCase.execute(fiscalCode, installation);
    if (result instanceof ErrorInternal) {
      return createHttpResponse(500, { error: result.message });
    }

    return createHttpResponse(200, { message: "ok" });
  };
