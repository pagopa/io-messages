// TODO: move this file to io-messages-common
export type JsonPatchOperation = "add" | "remove" | "replace";

export interface JsonPatch {
  op: JsonPatchOperation;
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
}
