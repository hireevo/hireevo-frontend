import { z } from 'zod';

/**
 * The rules the reset screen lists under the password field, and the ones the
 * sign-up strength meter is measured against. They are data rather than one
 * regular expression because the screen has to say which of them a password
 * currently satisfies, not just whether it passes. They mirror the backend's
 * PasswordSchema exactly; the shared-password-rule test keeps the two in step.
 */
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { id: 'upper', label: 'At least 1 uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'At least 1 lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { id: 'number', label: 'At least 1 number', test: (v: string) => /\d/.test(v) },
  {
    id: 'special',
    label: 'At least 1 special character',
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
] as const;

export const password = z
  .string()
  .refine((value) => PASSWORD_RULES.every((rule) => rule.test(value)), {
    message: 'Use 8+ characters with upper and lower case, a number and a special character.',
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
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Both passwords must match.',
    path: ['confirmPassword'],
  });

export const recoverSchema = z.object({ email });

export const confirmEmailSchema = z.object({
  // The address travels with the code because a code is only meaningful against
  // an owner — six digits on their own would be checkable against every pending
  // account at once.
  email: z.email({ message: 'Enter a valid email address.' }),
  code: z.string().regex(/^\d{6}$/, { message: 'Enter all six digits.' }),
});

export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .min(1, { message: 'This reset has expired. Start again from the recovery page.' }),
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Both passwords must match.',
    path: ['confirmPassword'],
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type RecoverValues = z.infer<typeof recoverSchema>;
export type ConfirmEmailValues = z.infer<typeof confirmEmailSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
