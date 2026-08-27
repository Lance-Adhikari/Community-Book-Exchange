import type { Metadata } from "next";

import { AuthPage } from "@/components/auth-page";
import { RegisterForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Register | Community Book Exchange" };

export default function RegisterPage() {
  return (
    <AuthPage
      title="Register"
      description="Create a new account to share and borrow books."
    >
      <RegisterForm />
    </AuthPage>
  );
}
