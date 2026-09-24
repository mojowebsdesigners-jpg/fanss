import type { Metadata } from "next";
import { SignupForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function SignupPage() {
  return (
    <AuthShell title="Join the world" subtitle="Free to join — unlock what you love">
      <SignupForm />
    </AuthShell>
  );
}
