import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email.")
  .pipe(z.email("Enter a valid email address."));

export const otpSchema = z
  .string()
  .trim()
  .length(6, "Enter all 6 digits.")
  .regex(/^\d{6}$/, "Codes only have digits.");

export const signInPasswordSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

const PASSWORD_RULES: { test: (value: string) => boolean; message: string }[] = [
  { test: (v) => v.length >= 8, message: "At least 8 characters." },
  { test: (v) => /[a-z]/.test(v), message: "At least one lowercase letter." },
  { test: (v) => /[A-Z]/.test(v), message: "At least one uppercase letter." },
  { test: (v) => /\d/.test(v), message: "At least one number." },
];

export function passwordStrengthIssues(password: string): string[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.message);
}

export const strongPasswordSchema = z
  .string()
  .min(1, "Enter a password.")
  .superRefine((value, ctx) => {
    for (const message of passwordStrengthIssues(value)) ctx.addIssue({ code: "custom", message });
  });

export const signUpSchema = z
  .object({
    businessName: z.string().trim().min(2, "Enter your business name."),
    firstName: z.string().trim().min(1, "Enter your first name."),
    lastName: z.string().trim().min(1, "Enter your last name."),
    email: emailSchema,
    password: strongPasswordSchema,
  })
  .strict();

export type SignUpInput = z.infer<typeof signUpSchema>;

export const newPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
