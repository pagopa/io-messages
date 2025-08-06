import { z } from "zod";

export const assertionRefSchema = z.union([
  z.string().regex(/^sha256-[A-Za-z0-9-_=]{1,44}$/),
  z.string().regex(/^sha384-[A-Za-z0-9-_=]{1,66}$/),
  z.string().regex(/^sha512-[A-Za-z0-9-_=]{1,88}$/),
]);

export type AssertionRef = z.TypeOf<typeof assertionRefSchema>;
