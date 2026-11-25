import { GenericError } from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";
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

export const installationIdSchema = z.string().min(1);
export const createOrUpdateInstallationSchema = z.object({
  platform: z.enum(["apns", "fcmv1"]),
  pushChannel: z.string(),
});
export const createOrUpdateInstallationMessageSchema = z.object({
  installationId: z.hash("sha256"),
  kind: z.literal("CreateOrUpdateInstallation"),
  platform: z.enum(["apns", "fcmv1"]),
  pushChannel: z.string(),
  tags: z.array(z.hash("sha256")),
});

export type CreateOrUpdateInstallation = z.infer<
  typeof createOrUpdateInstallationSchema
>;
export type CreateOrUpdateInstallationMessage = z.infer<
  typeof createOrUpdateInstallationMessageSchema
>;

export interface CreateOrUpdateInstallationRepository {
  createOrUpdateInstallation(
    installation: CreateOrUpdateInstallationMessage,
  ): Promise<Result<string, GenericError>>;
}
