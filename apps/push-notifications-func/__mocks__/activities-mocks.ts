import { vi } from "vitest";

import {
  ActivityInput as DeleteInstallationActivityInput,
  ActivityResultSuccess as DeleteInstallationActivityResultSuccess,
} from "../HandleNHDeleteInstallationCallActivity";
import {
  ActivityInput as NotifyMessageActivityInput,
  ActivityResultSuccess as NotifyMessageActivityResultSuccess,
} from "../HandleNHNotifyMessageCallActivity";
import {
  ActivityInput as IsUserInActiveSubsetActivityInput,
  ActivityResultSuccessWithValue as IsUserInActiveSubsetActivityResultSuccess,
} from "../IsUserInActiveSubsetActivity";
import { CallableActivity } from "../utils/durable/orchestrators";

type CallableIsUserInActiveSubsetActivity = CallableActivity<
  IsUserInActiveSubsetActivityInput,
  IsUserInActiveSubsetActivityResultSuccess
>;

/* eslint-disable require-yield */
export const getMockIsUserATestUserActivity = (res: boolean) =>
  vi.fn<
    (
      ...args: Parameters<CallableIsUserInActiveSubsetActivity>
    ) => ReturnType<CallableIsUserInActiveSubsetActivity>
  >(() =>
    (function* () {
      return { kind: "SUCCESS", value: res };
    })(),
  );
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

type CallableNotifyInstallationActivity = CallableActivity<
  NotifyMessageActivityInput,
  NotifyMessageActivityResultSuccess
>;

/* eslint-disable require-yield */
export const getMockNotifyMessageInstallationActivity = (
  result: NotifyMessageActivityResultSuccess,
) =>
  vi.fn<
    (
      ...args: Parameters<CallableNotifyInstallationActivity>
    ) => ReturnType<CallableNotifyInstallationActivity>
  >(() =>
    (function* () {
      return result;
    })(),
  );
/* eslint-enable require-yield */
