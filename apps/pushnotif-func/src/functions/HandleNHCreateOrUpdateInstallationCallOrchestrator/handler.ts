/* eslint-disable @typescript-eslint/no-unused-vars */
import { Task } from "durable-functions/lib/src/classes";
import * as t from "io-ts";

import { CreateOrUpdateInstallationMessage } from "../../generated/notifications/CreateOrUpdateInstallationMessage";
import { toString } from "../../utils/conversions";
import * as o from "../../utils/durable/orchestrators";
import { failureUnhandled } from "../../utils/durable/orchestrators";
import { getCallableActivity as getCreateOrUpdateCallableActivity } from "../HandleNHCreateOrUpdateInstallationCallActivity";

export const OrchestratorName =
  "HandleNHCreateOrUpdateInstallationCallOrchestrator";

/**
 * Carries information about Notification Hub Message payload
 */
export const NhCreateOrUpdateInstallationOrchestratorCallInput = t.type({
  message: CreateOrUpdateInstallationMessage,
});

export type NhCreateOrUpdateInstallationOrchestratorCallInput = t.TypeOf<
  typeof NhCreateOrUpdateInstallationOrchestratorCallInput
>;

interface IHandlerParams {
  readonly createOrUpdateActivity: ReturnType<
    typeof getCreateOrUpdateCallableActivity
  >;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getHandler = ({ createOrUpdateActivity }: IHandlerParams) =>
  o.createOrchestrator(
    OrchestratorName,
    NhCreateOrUpdateInstallationOrchestratorCallInput,
    function* ({
      context,
      input: {
        message: { installationId, platform, pushChannel, tags },
      },
      logger,
    }): Generator<Task, void, Task> {
      try {
        yield* createOrUpdateActivity(context, {
          installationId,
          platform,
          pushChannel,
          tags,
        });
      } catch (err) {
        // ^In case of exception, restore into legacy NH
        logger.error(
          failureUnhandled(
            `ERROR|TEST_USER ${installationId}: ${toString(err)}`,
          ),
        );

        yield* createOrUpdateActivity(context, {
          installationId,
          platform,
          pushChannel,
          tags,
        });

        throw err;
      }
    },
  );
