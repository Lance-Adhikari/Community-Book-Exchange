"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  login,
  register,
  requestPasswordReset,
  updatePassword,
} from "@/app/actions/auth";
import {
  initialAuthActionState,
  type AuthActionState,
} from "@/lib/auth-state";

type FieldProps = {
  autoComplete: string;
  defaultValue?: string;
  error?: string;
  label: string;
  maxLength: number;
  minLength?: number;
  name: "displayName" | "email" | "password" | "confirmPassword";
  type: "email" | "password" | "text";
};

function FormField({
  autoComplete,
  defaultValue,
  error,
  label,
  maxLength,
  minLength,
  name,
  type,
}: FieldProps) {
  const errorId = `${name}-error`;

  return (
    <div className="auth-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        minLength={minLength}
        maxLength={maxLength}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <span id={errorId} className="auth-field__error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function FormStatus({ state }: { state: AuthActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`auth-message auth-message--${state.status}`}
      role={state.status === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="auth-submit" type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialAuthActionState);

  return (
    <form className="auth-form" action={formAction} noValidate>
      <FormStatus state={state} />
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        maxLength={254}
        error={state.fieldErrors?.email}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        maxLength={128}
        error={state.fieldErrors?.password}
      />
      <SubmitButton label="Login" pendingLabel="Logging in…" />
      <div className="auth-links">
        <Link href="/forgot-password">Forgot your password?</Link>
        <Link href="/register">Create an account</Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(register, initialAuthActionState);
  const displayName = state.fieldValues?.displayName ?? "";
  const email = state.fieldValues?.email ?? "";

  return (
    <form className="auth-form" action={formAction} noValidate>
      <FormStatus state={state} />
      <FormField
        key={`displayName:${displayName}`}
        label="Display name"
        name="displayName"
        type="text"
        autoComplete="nickname"
        minLength={2}
        maxLength={80}
        defaultValue={displayName}
        error={state.fieldErrors?.displayName}
      />
      <FormField
        key={`email:${email}`}
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        maxLength={254}
        defaultValue={email}
        error={state.fieldErrors?.email}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={128}
        error={state.fieldErrors?.password}
      />
      <FormField
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={128}
        error={state.fieldErrors?.confirmPassword}
      />
      <SubmitButton label="Register" pendingLabel="Creating account…" />
      <div className="auth-links auth-links--single">
        <Link href="/login">Already have an account?</Link>
      </div>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    requestPasswordReset,
    initialAuthActionState,
  );

  return (
    <form className="auth-form" action={formAction} noValidate>
      <FormStatus state={state} />
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        maxLength={254}
        error={state.fieldErrors?.email}
      />
      <SubmitButton label="Send reset instructions" pendingLabel="Sending…" />
      <div className="auth-links auth-links--single">
        <Link href="/login">Return to login</Link>
      </div>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(updatePassword, initialAuthActionState);

  return (
    <form className="auth-form" action={formAction} noValidate>
      <FormStatus state={state} />
      <FormField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={128}
        error={state.fieldErrors?.password}
      />
      <FormField
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={128}
        error={state.fieldErrors?.confirmPassword}
      />
      <SubmitButton label="Update password" pendingLabel="Updating…" />
    </form>
  );
}
