// TODO: move this file to io-messages-common
export type JsonPatchOperation = "add" | "remove" | "replace";

export interface JsonPatch {
  op: JsonPatchOperation;
  path: string;
  value?: any;
}
