import { CallableActivity } from "../utils/durable/orchestrators";
import { vi } from "vitest";
import {
  ActivityInput as IsUserInActiveSubsetActivityInput,
  ActivityResultSuccessWithValue as IsUserInActiveSubsetActivityResultSuccess,
} from "../IsUserInActiveSubsetActivity";

import {
  ActivityInput as DeleteInstallationActivityInput,
  ActivityResultSuccess as DeleteInstallationActivityResultSuccess,
} from "../HandleNHDeleteInstallationCallActivity";

import {
  ActivityInput as NotifyMessageActivityInput,
  ActivityResultSuccess as NotifyMessageActivityResultSuccess,
} from "../HandleNHNotifyMessageCallActivity";

type CallableIsUserInActiveSubsetActivity = CallableActivity<
  IsUserInActiveSubsetActivityInput,
  IsUserInActiveSubsetActivityResultSuccess
>;

export const getMockIsUserATestUserActivity = (res: boolean): any =>
  vi.fn<
    (
      ...args: Parameters<CallableIsUserInActiveSubsetActivity>
    ) => ReturnType<CallableIsUserInActiveSubsetActivity>
  >(() =>
    (function* () {
      return { kind: "SUCCESS", value: res };
    })(),
  );

type CallableDeleteInstallationActivity = CallableActivity<
  DeleteInstallationActivityInput,
  DeleteInstallationActivityResultSuccess
>;
export const getMockDeleteInstallationActivity = (
  result: DeleteInstallationActivityResultSuccess,
): any =>
  vi.fn<
    (
      ...args: Parameters<CallableDeleteInstallationActivity>
    ) => ReturnType<CallableDeleteInstallationActivity>
  >(() =>
    (function* (_) {
      return result;
    })(),
  );

type CallableNotifyInstallationActivity = CallableActivity<
  NotifyMessageActivityInput,
  NotifyMessageActivityResultSuccess
>;
export const getMockNotifyMessageInstallationActivity = (
  result: NotifyMessageActivityResultSuccess,
): any =>
  vi.fn<
    (
      ...args: Parameters<CallableNotifyInstallationActivity>
    ) => ReturnType<CallableNotifyInstallationActivity>
  >(() =>
    (function* (_) {
      return result;
    })(),
  );
