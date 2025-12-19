import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import {
  withRequestMiddlewares,
  wrapRequestHandler,
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import {
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessNoContent,
} from "@pagopa/ts-commons/lib/responses";
import * as express from "express";

import { MassNotifyBody } from "./mass-notify.interface";
import { ILogger, createLogger } from "../../utils/logger";
import { SendNotification } from "./notification";
import { INonEmptyStringTag } from "@pagopa/ts-commons/lib/strings";

export type MassNotificationInfo = {
  subject: string & INonEmptyStringTag;
  body: string & INonEmptyStringTag;
  template: string & INonEmptyStringTag;
  tags: ReadonlyArray<string & INonEmptyStringTag>;
};

// -------------------------------------
// MassNotifyHandler
// -------------------------------------

type MassNotifyHandler = (
  logger: ILogger,
  notificationInfo: MassNotificationInfo,
) => Promise<
  | IResponseErrorForbiddenNotAuthorized
  | IResponseErrorInternal
  | IResponseErrorNotFound
  | IResponseSuccessNoContent
>;

export const MassNotifyHandler =
  (
    sendNotification: SendNotification,
    // eslint-disable-next-line max-params
  ): MassNotifyHandler =>
  async (logger, { subject, body, template, tags }): Promise<any> => {
    return sendNotification(subject, body, template, tags);
  };

export const MassNotify = (
  sendNotification: SendNotification,
  telemetryClient?: ReturnType<typeof initAppInsights>,
  // eslint-disable-next-line max-params
): express.RequestHandler => {
  const handler = MassNotifyHandler(sendNotification);
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(MassNotifyBody),
  );
  return wrapRequestHandler(
    middlewaresWrap((context, _) =>
      handler(createLogger(context, "MassNotify", telemetryClient), _),
    ),
  );
};
