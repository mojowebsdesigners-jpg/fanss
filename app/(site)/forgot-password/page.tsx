import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset password" subtitle="We'll email you a secure link">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
