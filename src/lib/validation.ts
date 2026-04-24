import { z } from "zod";

/** Auth input schemas. Trim, length-limit, and reject obviously malicious input. */
export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name must be under 80 characters")
  .regex(/^[\p{L}\p{M}\s.'-]+$/u, "Name contains invalid characters");

export const emailSchema = z.string().trim().toLowerCase().email("Invalid email").max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long");

export const signUpSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password required").max(128),
});

/** Strip basic HTML to neutralize XSS in user-rendered text. */
export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, "").slice(0, 5000);
}
