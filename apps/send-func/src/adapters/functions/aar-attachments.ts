import {
  attachmentNameSchema,
  idxSchema,
  iunSchema,
  mandateIdSchema,
} from "@/domain/notification.js";
import {
  AttachmentParams,
  GetAttachmentUseCase,
  attachmentParamsSchema,
} from "@/domain/use-cases/get-attachment.js";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { ExtentedHttpHandler } from "io-messages-common/adapters/middleware";

import {
  AarGetAttachmentResponse,
  problemJsonSchema,
} from "../send/definitions.js";
import { NotificationClientError } from "../send/notification.js";
import { malformedBodyResponse } from "./commons/response.js";

export const getAttachment =
  (
    getAttachmentUseCase: GetAttachmentUseCase,
  ): ExtentedHttpHandler<LollipopHeaders> =>
  async (
    request: HttpRequest,
    context: InvocationContext,
    lollipopHeaders: LollipopHeaders,
  ): Promise<AarGetAttachmentResponse> => {
    const isTest = request.query.get("isTest") === "true";

    const sendHeaders = {
      "x-pagopa-cx-taxid": lollipopHeaders["x-pagopa-lollipop-user-id"],
      "x-pagopa-pn-io-src":
        request.headers.get("x-pagopa-pn-io-src") || undefined,
      ...lollipopHeaders,
    };

    const mandateId = request.query.get("mandateId") || undefined;
    const parsedMandateId = mandateId
      ? mandateIdSchema.safeParse(mandateId)
      : { data: mandateId, success: true };

    if (!parsedMandateId.success)
      return malformedBodyResponse(
        `Malformed mandateId ${mandateId}`,
        "Bad Request",
      );

    const attachmentParams = safeParseAttachmentUrl(
      request.params.attachmentUrl,
    );

    if (!attachmentParams.success)
      return malformedBodyResponse(
        attachmentParams.error.message,
        "Bad Request",
      );

    try {
      const response = await getAttachmentUseCase.execute(
        attachmentParams.data,
        sendHeaders,
        isTest,
        parsedMandateId.data,
      );
      return { jsonBody: response, status: 200 };
    } catch (err) {
      if (err instanceof NotificationClientError) {
        context.error("Notification client error:", err.message);

        const problemJson = problemJsonSchema.parse(err.body);

        return {
          jsonBody: problemJson,
          status: 500,
        };
      }

      return {
        jsonBody: {
          detail: "Internal server error",
          status: 500,
        },
        status: 500,
      };
    }
  };

function safeParseAttachmentUrl(
  urlEncodedBase64Url: string,
):
  | { data: AttachmentParams; success: true }
  | { error: Error; success: false } {
  try {
    const base64Url = decodeURIComponent(urlEncodedBase64Url);
    const base64UrlBuffer = Buffer.from(base64Url, "base64");
    const attachmentUrl = base64UrlBuffer.toString("utf8");

    const [path, queryString] = attachmentUrl.split("?");
    const searchParams = new URLSearchParams(queryString);

    const paymentRegex =
      /^\/delivery\/notifications\/received\/([^/]+)\/attachments\/payment\/([^/]+)$/;

    const documentsRegex =
      /^\/delivery\/notifications\/received\/([^/]+)\/attachments\/documents\/([^/]+)$/;

    const paymentMatch = path.match(paymentRegex);
    if (paymentMatch) {
      const [, iun, attachmentName] = paymentMatch;

      const parsedIun = iunSchema.parse(iun);
      const parsedAttachmentName = attachmentNameSchema.parse(attachmentName);

      const attachmentIdx = searchParams.has("attachmentIdx")
        ? idxSchema.parse(Number(searchParams.get("attachmentIdx")))
        : undefined;

      return {
        data: attachmentParamsSchema.parse({
          attachmentName: parsedAttachmentName,
          iun: parsedIun,
          type: "payment",
          ...(attachmentIdx ? { attachmentIdx } : {}),
        }),
        success: true,
      };
    }

    const documentMatch = path.match(documentsRegex);
    if (documentMatch) {
      const [, iun, docIdx] = documentMatch;

      const parsedIun = iunSchema.parse(iun);
      const parsedDocIdx = idxSchema.parse(docIdx);

      return {
        data: attachmentParamsSchema.parse({
          docIdx: parsedDocIdx,
          iun: parsedIun,
          type: "document",
        }),
        success: true,
      };
    }

    throw new Error(`Malformed attachmentUrl ${attachmentUrl}`);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error
          : new Error(`Malformed attachmentUrl ${urlEncodedBase64Url}`),
      success: false,
    };
  }
}
