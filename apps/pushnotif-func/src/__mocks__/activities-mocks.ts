import { vi } from "vitest";

import {
  ActivityInput as DeleteInstallationActivityInput,
  ActivityResultSuccess as DeleteInstallationActivityResultSuccess,
} from "../functions/HandleNHDeleteInstallationCallActivity";
import { CallableActivity } from "../utils/durable/orchestrators";

/* eslint-enable require-yield */

type CallableDeleteInstallationActivity = CallableActivity<
  DeleteInstallationActivityInput,
  DeleteInstallationActivityResultSuccess
>;

/* eslint-disable require-yield */
export const getMockDeleteInstallationActivity = (
  result: DeleteInstallationActivityResultSuccess,
) =>
  vi.fn<
    (
      ...args: Parameters<CallableDeleteInstallationActivity>
    ) => ReturnType<CallableDeleteInstallationActivity>
  >(() =>
    (function* () {
      return result;
    })(),
  );
/* eslint-enable require-yield */
