import { z } from "zod";

export const sha256ThumbprintSchema = z
  .string()
  .regex(/^([A-Za-z0-9\-_]{1,44})$/, "Invalid SHA-256 thumbprint");
export const sha384ThumbprintSchema = z
  .string()
  .regex(/^([A-Za-z0-9\-_]{1,66})$/, "Invalid SHA-384 thumbprint");
export const sha512ThumbprintSchema = z
  .string()
  .regex(/^([A-Za-z0-9\-_]{1,88})$/, "Invalid SHA-512 thumbprint");

export const thumbprintSchema = z.union([
  sha256ThumbprintSchema,
  sha384ThumbprintSchema,
  sha512ThumbprintSchema,
]);

export type Thumbprint = z.infer<typeof thumbprintSchema>;
