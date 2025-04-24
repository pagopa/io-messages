import { z } from "zod";

export const auditLogSchema = z.object({
  kind: z.literal("DELETE_MESSAGE"),
  messageId: z.string().nonempty(),
  timestamp: z.number().int().positive(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

export const deleteMessageAuditLog = (messageId: string) => ({
  kind: "DELETE_MESSAGE" as const,
  messageId,
  timestamp: Date.now(),
});

export interface AuditLogger {
  log(a: AuditLog): Promise<void>;
}
