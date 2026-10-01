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
  // Bounded to the column the API stores it in (256), so an over-long value is
  // caught here and not only on submit. Derived from the contract; see the
  // drift test in schemas.test.ts.
  .max(256, { message: 'Use 256 characters or fewer.' })
  .refine((value) => PASSWORD_RULES.every((rule) => rule.test(value)), {
    message: 'Use 8+ characters, mixed case, a number and a symbol.',
  });

/**
 * What a person's name is made of, as the API's `PersonNameSchema` says.
 *
 * Letters of any script, plus the punctuation names genuinely carry — a space,
 * an apostrophe, a hyphen, a full stop — and it has to start with a letter. The
 * field used to take any string of eighty characters or fewer, so `<script>`
 * was a perfectly good first name, and this name goes on a public profile.
 *
 * The pattern is checked against `openapi.json` in schemas.test.ts rather than
 * trusted to have been copied faithfully (§6.1).
 */
const NAME_CHARACTERS = /^[\p{L}\p{M}][\p{L}\p{M} '’\-.]*$/u;

const WRONG_CHARACTERS = 'Use letters, and the spaces, apostrophes, hyphens or full stops in it.';

export const personName = (what: string) =>
  z
    .string()
    .trim()
    .min(1, { message: `Enter your ${what}.` })
    .max(80, { message: 'Use 80 characters or fewer.' })
    .regex(NAME_CHARACTERS, { message: WRONG_CHARACTERS });

const email = z
  .email({ message: 'Enter a valid email address.' })
  .max(254, { message: 'Enter an email of 254 characters or fewer.' });

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
    firstName: personName('first name'),
    lastName: personName('last name'),
    email,
    username: z
      .string()
      .trim()
      .min(3, { message: 'Usernames are at least 3 characters.' })
      .max(30, { message: 'Usernames are 30 characters or fewer.' })
      // Mirrors the API contract exactly (^[a-zA-Z][a-zA-Z0-9_-]*$): start with a
      // letter, then letters, numbers, hyphens or underscores. The old client
      // rule drifted — it accepted a leading underscore or digit the API refuses
      // and rejected the hyphen the API allows. See the drift test.
      .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, {
        message: 'Start with a letter; then letters, numbers, hyphens or underscores.',
      }),
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
