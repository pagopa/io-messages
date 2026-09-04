import { isIP } from "node:net";
import z from "zod";

export const clientIpSchema = z
  .string()
  .refine((value) => isIP(value) !== 0)
  .brand<"ClientIp">();
export type ClientIp = z.TypeOf<typeof clientIpSchema>;

export const authorizedCidrSchema = z.ipv4().or(z.cidrv4());
