import z from "zod";

export const supportedPlatformSchema = z.preprocess(
  (val) => (typeof val === "string" ? val.toLowerCase() : val),
  z.union([z.literal("apns"), z.literal("fcmv1")]),
);

export const installationSummarySchema = z.object({
  id: z.hash("sha256"), // The installationId
  // The partition of the Notification hub where the installation is stored.
  nhPartition: z.union([
    z.literal("1"),
    z.literal("2"),
    z.literal("3"),
    z.literal("4"),
  ]),
  platform: supportedPlatformSchema,
  updatedAt: z.number(),
});

export const installationSchema = z.object({
  installationId: z.hash("sha256"),
  platform: supportedPlatformSchema,
});

export type Installation = z.infer<typeof installationSchema>;
export type InstallationSummary = z.infer<typeof installationSummarySchema>;
