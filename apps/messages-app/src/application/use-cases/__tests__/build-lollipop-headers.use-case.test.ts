import type { LollipopRequiredHeaders } from "io-messages-common/adapters/lollipop/definitions/request-headers";

import {
  ForbiddenError,
  GenericError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import {
  aFiscalCode,
  aSignatureInput,
  anAssertionRef,
  anLcParams,
} from "io-messages-common/adapters/lollipop/__mocks__/lollipop";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { LcParamsRepository } from "../../ports/lc-params.js";

import { makeBuildLollipopHeadersUseCase } from "../build-lollipop-headers.use-case.js";

const anOperationId = "a-generated-operation-id";

const requestHeaders: LollipopRequiredHeaders = {
  signature: "sig1=:aSignature:",
  "signature-input": aSignatureInput,
  "x-pagopa-lollipop-original-method": "POST",
  "x-pagopa-lollipop-original-url": "https://api.example.com/messages",
};

const makeRepository = (): LcParamsRepository => ({
  generateLcParams: vi.fn().mockResolvedValue(ok(anLcParams)),
});

describe("makeBuildLollipopHeadersUseCase", () => {
  it("returns the merged lollipop headers on success", async () => {
    const repository = makeRepository();
    const useCase = makeBuildLollipopHeadersUseCase(
      repository,
      () => anOperationId,
    );

    const result = await useCase({
      assertionRef: anAssertionRef,
      fiscalCode: aFiscalCode,
      requestHeaders,
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      ...requestHeaders,
      "x-pagopa-lollipop-assertion-ref": anLcParams.assertion_ref,
      "x-pagopa-lollipop-assertion-type": anLcParams.assertion_type,
      "x-pagopa-lollipop-auth-jwt": anLcParams.lc_authentication_bearer,
      "x-pagopa-lollipop-public-key": anLcParams.pub_key,
      "x-pagopa-lollipop-user-id": aFiscalCode,
    });
    expect(repository.generateLcParams).toHaveBeenCalledWith(
      anAssertionRef,
      anOperationId,
    );
  });

  it("falls back to the generated operation id when signature-input has no nonce", async () => {
    const repository = makeRepository();
    const useCase = makeBuildLollipopHeadersUseCase(
      repository,
      () => anOperationId,
    );

    await useCase({
      assertionRef: anAssertionRef,
      fiscalCode: aFiscalCode,
      requestHeaders,
    });

    expect(repository.generateLcParams).toHaveBeenCalledWith(
      anAssertionRef,
      anOperationId,
    );
  });

  it("uses the nonce carried by signature-input when present", async () => {
    const repository = makeRepository();
    const useCase = makeBuildLollipopHeadersUseCase(repository);

    await useCase({
      assertionRef: anAssertionRef,
      fiscalCode: aFiscalCode,
      requestHeaders: {
        ...requestHeaders,
        "signature-input": `${aSignatureInput}, nonce="a-nonce"`,
      },
    });

    expect(repository.generateLcParams).toHaveBeenCalledWith(
      anAssertionRef,
      "a-nonce",
    );
  });

  it("returns a ForbiddenError when the assertion ref is missing", async () => {
    const repository = makeRepository();
    const useCase = makeBuildLollipopHeadersUseCase(repository);

    const result = await useCase({
      assertionRef: undefined,
      fiscalCode: aFiscalCode,
      requestHeaders,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expect(repository.generateLcParams).not.toHaveBeenCalled();
  });

  it("returns a ValidationError when signature-input has no keyid", async () => {
    const repository = makeRepository();
    const useCase = makeBuildLollipopHeadersUseCase(repository);

    const result = await useCase({
      assertionRef: anAssertionRef,
      fiscalCode: aFiscalCode,
      requestHeaders: {
        ...requestHeaders,
        "signature-input": 'sig1=("x-pagopa-lollipop-original-method")',
      },
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ValidationError);
    expect(repository.generateLcParams).not.toHaveBeenCalled();
  });

  it("returns a ForbiddenError when the assertion ref does not match the signature thumbprint", async () => {
    const repository = makeRepository();
    const useCase = makeBuildLollipopHeadersUseCase(repository);

    const result = await useCase({
      assertionRef: "sha256-differentThumbprint=",
      fiscalCode: aFiscalCode,
      requestHeaders,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expect(repository.generateLcParams).not.toHaveBeenCalled();
  });

  it("returns repository errors", async () => {
    const error = new GenericError("lollipop unavailable");
    const repository = makeRepository();
    vi.mocked(repository.generateLcParams).mockResolvedValue(err(error));
    const useCase = makeBuildLollipopHeadersUseCase(repository);

    const result = await useCase({
      assertionRef: anAssertionRef,
      fiscalCode: aFiscalCode,
      requestHeaders,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(error);
  });
});
