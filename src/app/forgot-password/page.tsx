import type { Metadata } from "next";

import { AuthPage } from "@/components/auth-page";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Reset password | Community Book Exchange",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      title="Reset your password"
      description="Enter your email and we will send reset instructions if an account matches."
    >
      <ForgotPasswordForm />
    </AuthPage>
  );
}
