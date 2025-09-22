import { z } from "zod";

export const lollipopOriginalURLSchema = z.string().regex(/^https:\/\//, {
  message: "LollipopOriginalURL must start with https://",
});

export type LollipopOriginalURL = z.infer<typeof lollipopOriginalURLSchema>;
