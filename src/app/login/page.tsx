import type { Metadata } from "next";

import { AuthPage } from "@/components/auth-page";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Login | Community Book Exchange" };

type LoginPageProps = {
  searchParams: Promise<{ message?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { message, next } = await searchParams;

  return (
    <AuthPage title="Login" description="Access your Community Book Exchange account.">
      {message === "authentication-failed" ? (
        <p className="auth-message auth-message--error" role="alert">
          We could not complete authentication. Please try again.
        </p>
      ) : null}
      <LoginForm nextPath={next} />
    </AuthPage>
  );
}
