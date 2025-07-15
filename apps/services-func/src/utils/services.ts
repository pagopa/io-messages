import { ActivationStatusEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ActivationStatus";
import { RetrievedActivation } from "@pagopa/io-functions-commons/dist/src/models/activation";
import { Second } from "@pagopa/ts-commons/lib/units";
import { isBefore, subSeconds } from "date-fns";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/function";

export type CanSendMessageOnActivation = (
  maybeActivation: O.Option<RetrievedActivation>,
) => boolean;

/**
 * Configure a function with grace period that
 * returns true if:
 * - the Service Activation is present and ACTIVE
 * - the Service Activation is present and PENDING within the grace period
 *
 * @param pendingActivationGracePeriod PENDING grace period in seconds
 */
export const canSendMessageOnActivationWithGrace =
  (pendingActivationGracePeriod: Second): CanSendMessageOnActivation =>
  (maybeActivation: O.Option<RetrievedActivation>): boolean =>
    pipe(
      maybeActivation,
      O.map(
        (activation) =>
          activation.status === ActivationStatusEnum.ACTIVE ||
          (activation.status === ActivationStatusEnum.PENDING &&
            isBefore(
              subSeconds(new Date(), pendingActivationGracePeriod),
              // eslint-disable-next-line no-underscore-dangle
              activation._ts,
            )),
      ),
      O.getOrElse(() => false),
    );
