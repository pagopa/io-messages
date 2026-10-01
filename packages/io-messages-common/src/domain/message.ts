import z from "zod";

export const messageIDSchema = z.ulid();
export type MessageId = z.infer<typeof messageIDSchema>;

export const rptIdSchema = z
  .string()
  .regex(/^(?:[a-zA-Z\d]{1,35}|RF\d{2}[a-zA-Z\d]{1,21})$/);
