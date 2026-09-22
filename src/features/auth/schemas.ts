import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers and _");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[a-zA-Z]/, "Password needs a letter")
  .regex(/[0-9]/, "Password needs a number");

export const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().email("Enter a valid email address").max(254),
  password: passwordSchema,
  country: z.string().length(2, "Use a 2-letter country code").optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const profileUpdateSchema = z.object({
  bio: z.string().max(300, "Bio must be at most 300 characters"),
  country: z.string().length(2, "Use a 2-letter country code").optional().or(z.literal("")),
  image: z.union([z.literal(""), z.string().url("Image must be a valid URL")]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
