import { Task } from "durable-functions/lib/src/classes";
import * as t from "io-ts";

import { DeleteInstallationMessage } from "../../generated/notifications/DeleteInstallationMessage";
import * as o from "../../utils/durable/orchestrators";
import { getCallableActivity as getDeleteInstallationCallableActivity } from "../HandleNHDeleteInstallationCallActivity";

export const OrchestratorName = "HandleNHDeleteInstallationCallOrchestrator";

/**
 * Carries information about Notification Hub Message payload
 */
export type OrchestratorCallInput = t.TypeOf<typeof OrchestratorCallInput>;
export const OrchestratorCallInput = t.type({
  message: DeleteInstallationMessage,
});

interface IHandlerParams {
  readonly deleteInstallationActivity: ReturnType<
    typeof getDeleteInstallationCallableActivity
  >;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getHandler = ({ deleteInstallationActivity }: IHandlerParams) =>
  o.createOrchestrator(
    OrchestratorName,
    OrchestratorCallInput,
    function* ({
      context,
      input: {
        message: { installationId },
      },
      logger,
    }): Generator<Task, void, Task> {
      logger.info(`Deleting user ${installationId} from Notification Hub`);

      yield* deleteInstallationActivity(context, {
        installationId,
      });
    },
  );
