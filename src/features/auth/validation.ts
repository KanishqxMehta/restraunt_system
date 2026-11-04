import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password.").max(128),
});
export const signUpSchema = signInSchema.extend({
  name: z
    .string()
    .trim()
    .min(2, "Enter at least two characters.")
    .max(80, "Use at most 80 characters."),
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(128, "Use at most 128 characters."),
  marketingOptIn: z.boolean().default(false),
});
