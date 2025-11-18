export interface RegRow {
  installationId: string;
  platform: string;
  pushChannel: string;
}

export interface SasParams {
  hubName: string;
  key: string;
  keyName: string;
  namespace: string;
}

export const APNSTemplate =
  '{"aps": {"alert": {"title": "$(title)", "body": "$(message)"}}, "message_id": "$(message_id)"}';

export const FCMV1Template =
  '{"message": {"notification": {"title": "$(title)", "body": "$(message)"}, "android": {"data": {"message_id": "$(message_id)"}, "notification": {"icon": "ic_notification"}}}}';

export enum APNSPushType {
  ALERT = "alert",
  BACKGROUND = "background",
  COMPLICATION = "complication",
  FILEPROVIDER = "fileprovider",
  MDM = "mdm",
  VOIP = "voip",
}
