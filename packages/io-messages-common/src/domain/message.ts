import z from "zod";

export const messageIDSchema = z.ulid();
export type MessageId = z.infer<typeof messageIDSchema>;
