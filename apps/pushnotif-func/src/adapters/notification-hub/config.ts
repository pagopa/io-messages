import z from "zod";

const notificationHubPartitionSchema = z.object({
  connectionString: z.string().min(1),
  name: z.string().min(1),
  partitionRegex: z.string().min(1),
});

export const notificationHubConfigSchema = z.object({
  partition1: notificationHubPartitionSchema,
  partition2: notificationHubPartitionSchema,
  partition3: notificationHubPartitionSchema,
  partition4: notificationHubPartitionSchema,
});
