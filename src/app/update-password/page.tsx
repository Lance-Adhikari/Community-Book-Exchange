import type { Metadata } from "next";

import { AuthPage } from "@/components/auth-page";
import { UpdatePasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Choose a new password | Community Book Exchange",
};

export default function UpdatePasswordPage() {
  return (
    <AuthPage
      title="Choose a new password"
      description="Use the verified recovery link from your email to set a new password."
    >
      <UpdatePasswordForm />
    </AuthPage>
  );
}
