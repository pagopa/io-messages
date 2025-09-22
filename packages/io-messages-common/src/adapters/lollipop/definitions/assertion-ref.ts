import { z } from "zod";

export const assertionRefSha256Schema = z
  .string()
  .regex(/^sha256-[A-Za-z0-9-_=]{1,44}$/);
export type AssertionRef256 = z.infer<typeof assertionRefSha256Schema>;

export const assertionRefSha384Schema = z
  .string()
  .regex(/^sha384-[A-Za-z0-9-_=]{1,66}$/);
export type AssertionRef384 = z.infer<typeof assertionRefSha384Schema>;

export const assertionRefSha512Schema = z
  .string()
  .regex(/^sha512-[A-Za-z0-9-_=]{1,88}$/);
export type AssertionRef512 = z.infer<typeof assertionRefSha512Schema>;

export const assertionRefSchema = z.union([
  assertionRefSha256Schema,
  assertionRefSha384Schema,
  assertionRefSha512Schema,
]);

export type AssertionRef = z.infer<typeof assertionRefSchema>;
