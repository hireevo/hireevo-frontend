import { describe, expect, it } from 'vitest';
import {
  PASSWORD_RULES,
  confirmEmailSchema,
  recoverSchema,
  signInSchema,
  signUpSchema,
} from './schemas.ts';

const validSignUp = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  username: 'ada_l',
  password: 'Passw0rdy',
  confirmPassword: 'Passw0rdy',
  terms: true,
};

describe('password rules', () => {
  it('states the four rules the sign-up screen lists', () => {
    expect(PASSWORD_RULES.map((rule) => rule.label)).toEqual([
      'At least 8 characters',
      'At least 1 uppercase letter',
      'At least 1 lowercase letter',
      'At least 1 number',
    ]);
  });

  it.each([
    ['Sh0rt', 'length'],
    ['nouppercase1', 'upper'],
    ['NOLOWERCASE1', 'lower'],
    ['NoDigitsHere', 'number'],
  ])('marks %s as failing the %s rule', (value, id) => {
    const rule = PASSWORD_RULES.find((candidate) => candidate.id === id);
    expect(rule?.test(value)).toBe(false);
    expect(
      signUpSchema.safeParse({ ...validSignUp, password: value, confirmPassword: value }).success,
    ).toBe(false);
  });
});

describe('signInSchema', () => {
  it('accepts an existing password that would fail today’s rules', () => {
    // A returning user's password predates the rules. Rejecting it in the
    // browser locks them out of an account the server would happily accept.
    const result = signInSchema.safeParse({ email: 'a@b.co', password: 'old', remember: true });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed address', () => {
    expect(signInSchema.safeParse({ email: 'nope', password: 'x', remember: false }).success).toBe(
      false,
    );
  });
});

describe('signUpSchema', () => {
  it('accepts a complete, consistent submission', () => {
    expect(signUpSchema.safeParse(validSignUp).success).toBe(true);
  });

  it('puts a password mismatch on the field the user must change', () => {
    const result = signUpSchema.safeParse({ ...validSignUp, confirmPassword: 'Passw0rdz' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword']);
  });

  it('rejects a username containing punctuation', () => {
    expect(signUpSchema.safeParse({ ...validSignUp, username: 'ada.l' }).success).toBe(false);
  });

  it('will not accept a sign-up that has not agreed to the terms', () => {
    const result = signUpSchema.safeParse({ ...validSignUp, terms: false });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === 'terms')).toBe(true);
  });
});

describe('recoverSchema', () => {
  it('needs only a valid address', () => {
    expect(recoverSchema.safeParse({ email: 'ada@example.com' }).success).toBe(true);
  });

  it('no longer carries a remember-me field', () => {
    // The control was removed from the recovery screen; the schema should not
    // still describe it.
    expect('remember' in recoverSchema.shape).toBe(false);
  });
});

describe('confirmEmailSchema', () => {
  const EMAIL = 'ayesha@example.com';

  it.each([
    ['418302', true],
    ['4183', false],
    ['4183021', false],
    ['41830a', false],
  ])('treats %s as %s', (code, expected) => {
    expect(confirmEmailSchema.safeParse({ email: EMAIL, code }).success).toBe(expected);
  });

  it('requires the address the code belongs to', () => {
    // A code is only meaningful against an owner: six digits on their own would
    // be checkable against every pending account at once, which is what makes
    // the address part of the request rather than a convenience.
    expect(confirmEmailSchema.safeParse({ code: '418302' }).success).toBe(false);
  });
});
