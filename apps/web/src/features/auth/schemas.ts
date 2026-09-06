import { z } from 'zod';

/**
 * The four rules the sign-up screen lists under the password field. They are
 * data rather than one regular expression because the screen has to say which
 * of them a password currently satisfies, not just whether it passes.
 */
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { id: 'upper', label: 'At least 1 uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'At least 1 lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { id: 'number', label: 'At least 1 number', test: (v: string) => /\d/.test(v) },
] as const;

export const password = z
  .string()
  .refine((value) => PASSWORD_RULES.every((rule) => rule.test(value)), {
    message: 'Password does not meet all four requirements.',
  });

const email = z.email({ message: 'Enter a valid email address.' });

export const signInSchema = z.object({
  email,
  // Deliberately not `password`: an existing account may predate the current
  // rules, and telling a returning user their real password is invalid is worse
  // than letting the server reject it.
  password: z.string().min(1, { message: 'Enter your password.' }),
  remember: z.boolean(),
});

export const signUpSchema = z
  .object({
    firstName: z.string().trim().min(1, { message: 'Enter your first name.' }),
    lastName: z.string().trim().min(1, { message: 'Enter your last name.' }),
    email,
    username: z
      .string()
      .trim()
      .min(3, { message: 'Usernames are at least 3 characters.' })
      .regex(/^[a-z0-9_]+$/i, { message: 'Letters, numbers and underscores only.' }),
    password,
    confirmPassword: z.string(),
    remember: z.boolean(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Both passwords must match.',
    path: ['confirmPassword'],
  });

export const recoverSchema = z.object({ email, remember: z.boolean() });

export const confirmEmailSchema = z.object({
  code: z.string().regex(/^\d{6}$/, { message: 'Enter all six digits.' }),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type RecoverValues = z.infer<typeof recoverSchema>;
export type ConfirmEmailValues = z.infer<typeof confirmEmailSchema>;
