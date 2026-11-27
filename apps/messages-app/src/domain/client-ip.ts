import { BlockList, isIP } from "node:net";
import z from "zod";

export const clientIpSchema = z
  .string()
  .refine((value) => isIP(value) !== 0)
  .brand<"ClientIp">();
export type ClientIp = z.TypeOf<typeof clientIpSchema>;

export const authorizedCidrSchema = z.ipv4().or(z.cidrv4());

export const isClientIpAuthorized = (
  clientIp: ClientIp,
  authorizedCidrs: readonly string[],
): boolean => {
  if (authorizedCidrs.length === 0) {
    return true;
  }

  const blockList = new BlockList();
  for (const cidr of authorizedCidrs) {
    // The legacy implementation treats an address without a subnet as /32.
    const separatorIndex = cidr.lastIndexOf("/");
    const address =
      separatorIndex === -1 ? cidr : cidr.slice(0, separatorIndex);
    const prefixLength =
      separatorIndex === -1 ? 32 : Number(cidr.slice(separatorIndex + 1));
    blockList.addSubnet(address, prefixLength, "ipv4");
  }

  const clientIpFamily = clientIp.includes(":") ? "ipv6" : "ipv4";
  return blockList.check(clientIp, clientIpFamily);
};
