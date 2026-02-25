import z from "zod";

export const installationSummarySchema = z.object({
  id: z.hash("sha256"), // The installationId.
  nhPartition: z.union([
    z.literal("1"),
    z.literal("2"),
    z.literal("3"),
    z.literal("4"),
  ]), // The partition of the Notification hub where it is stored.
  createdAt: z.number(),
  updatedAt: z.number(),
});
