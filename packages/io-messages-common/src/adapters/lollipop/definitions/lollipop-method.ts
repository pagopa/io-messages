import { z } from "zod";

export const lollipopMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

export type LollipopMethod = z.infer<typeof lollipopMethodSchema>;
