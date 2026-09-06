'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Checkbox, PasswordField, TextField } from '@hireevo/ui-web';
import { signUp } from './api.ts';
import { FormMessage } from './form-message.tsx';
import { PasswordRules } from './password-rules.tsx';
import { signUpSchema } from './schemas.ts';
import { useAuthForm } from './use-auth-form.ts';

export function SignUpForm() {
  const { fieldErrors, formError, pending, run, clearField } = useAuthForm(signUpSchema, signUp);
  // The only controlled field: the rules list below it has to re-read the value
  // on every keystroke, which is the whole point of showing the list.
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run({
      firstName: data.get('firstName'),
      lastName: data.get('lastName'),
      email: data.get('email'),
      username: data.get('username'),
      password: data.get('password'),
      confirmPassword: data.get('confirmPassword'),
      remember: data.get('remember') === 'on',
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col">
      <div className="flex flex-col gap-[25px]">
        {/* 244 / 270 with a 16px gutter, straight from the design's 530px column. */}
        <div className="grid grid-cols-[244fr_270fr] gap-4">
          <TextField
            label="First Name"
            name="firstName"
            autoComplete="given-name"
            placeholder="Ex. John"
            error={fieldErrors.firstName}
            onChange={() => clearField('firstName')}
          />
          <TextField
            label="Last Name"
            name="lastName"
            autoComplete="family-name"
            placeholder="Ex. John"
            error={fieldErrors.lastName}
            onChange={() => clearField('lastName')}
          />
        </div>

        <div className="grid grid-cols-[244fr_270fr] gap-4">
          <TextField
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="example@gmail.com"
            error={fieldErrors.email}
            onChange={() => clearField('email')}
          />
          <TextField
            label="User Name"
            name="username"
            autoComplete="username"
            placeholder="john45461"
            error={fieldErrors.username}
            onChange={() => clearField('username')}
          />
        </div>

        <div>
          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            error={fieldErrors.password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearField('password');
            }}
          />
          <PasswordRules value={password} />
        </div>

        <PasswordField
          label="Re-Password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          error={fieldErrors.confirmPassword}
          onChange={() => clearField('confirmPassword')}
        />
      </div>

      <div className="mt-[25px] flex items-center justify-between gap-4">
        <Checkbox name="remember">Remember me</Checkbox>
        <Link href="/recover" className="text-base text-content-link underline underline-offset-2">
          Forgot Password?
        </Link>
      </div>

      {formError === null ? null : (
        <div className="mt-6">
          <FormMessage>{formError}</FormMessage>
        </div>
      )}

      <Button type="submit" size="xl" fullWidth loading={pending} className="mt-10">
        Create Account
      </Button>
    </form>
  );
}
