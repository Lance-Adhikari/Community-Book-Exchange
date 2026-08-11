"use server";

import { redirect } from "next/navigation";

import type { AuthActionState } from "@/lib/auth-state";
import { getPublicEnvironment } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authCallbackUrl(nextPath: "/dashboard" | "/update-password") {
  const environment = getPublicEnvironment();
  const callbackUrl = new URL("/auth/callback", environment.siteUrl);
  callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}

function valueFrom(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function errorState(
  message: string,
  fieldErrors?: AuthActionState["fieldErrors"],
  fieldValues?: AuthActionState["fieldValues"],
): AuthActionState {
  return { status: "error", message, fieldErrors, fieldValues };
}

function registrationFieldValues(
  displayName: string,
  email: string,
): AuthActionState["fieldValues"] {
  return {
    displayName: displayName.length <= 80 ? displayName : "",
    email: email.length <= 254 ? email : "",
  };
}

export async function register(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const displayName = normalizeDisplayName(valueFrom(formData, "displayName"));
  const email = normalizeEmail(valueFrom(formData, "email"));
  const password = valueFrom(formData, "password");
  const confirmPassword = valueFrom(formData, "confirmPassword");
  const fieldErrors: AuthActionState["fieldErrors"] = {};
  const fieldValues = registrationFieldValues(displayName, email);

  if (displayName.length < 2 || displayName.length > 80) {
    fieldErrors.displayName = "Enter a display name between 2 and 80 characters.";
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (password.length < 8 || password.length > 128) {
    fieldErrors.password = "Use a password between 8 and 128 characters.";
  }

  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "The passwords do not match.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorState(
      "Please correct the highlighted fields.",
      fieldErrors,
      fieldValues,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: authCallbackUrl("/dashboard"),
    },
  });

  if (error) {
    return errorState(
      "We could not create your account. Check the details and try again.",
      undefined,
      fieldValues,
    );
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    status: "success",
    message: "Check your email to finish creating your account.",
  };
}

export async function login(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = normalizeEmail(valueFrom(formData, "email"));
  const password = valueFrom(formData, "password");

  if (email.length > 254 || !EMAIL_PATTERN.test(email) || password.length > 128) {
    return errorState("The email or password is invalid.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return errorState("The email or password is invalid.");
  }

  redirect("/dashboard");
}

export async function requestPasswordReset(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = normalizeEmail(valueFrom(formData, "email"));

  if (email.length <= 254 && EMAIL_PATTERN.test(email)) {
    const supabase = await createClient();

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl("/update-password"),
    });
  }

  return {
    status: "success",
    message:
      "If an account matches that email, password-reset instructions will arrive shortly.",
  };
}

export async function updatePassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = valueFrom(formData, "password");
  const confirmPassword = valueFrom(formData, "confirmPassword");
  const fieldErrors: AuthActionState["fieldErrors"] = {};

  if (password.length < 8 || password.length > 128) {
    fieldErrors.password = "Use a password between 8 and 128 characters.";
  }

  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "The passwords do not match.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorState("Please correct the highlighted fields.", fieldErrors);
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    return errorState("This password-recovery link is no longer valid.");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return errorState("We could not update your password. Request a new link and try again.");
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
