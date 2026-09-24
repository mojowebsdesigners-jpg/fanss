"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "./ui";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { supabaseBrowser } = await import("@/lib/supabase-browser");
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
        return;
      }
      router.push(params.get("next") || "/creator");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <Input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" minLength={8} />
      {err && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
      <Button type="submit" loading={loading} className="w-full" size="lg">Sign in</Button>
      <div className="flex justify-between text-xs text-mist">
        <Link href="/forgot-password" className="hover:text-champagne">Forgot password?</Link>
        <Link href="/signup" className="hover:text-champagne">Create account</Link>
      </div>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { supabaseBrowser } = await import("@/lib/supabase-browser");
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toLowerCase().replace(/[^a-z0-9_]/g, ""),
            ref_username: params.get("ref") || undefined,
          },
        },
      });
      if (error) {
        setErr(error.message);
        return;
      }
      // Auto-in is on unless email confirmation is enabled in Supabase.
      const { data: sess } = await sb.auth.getSession();
      if (sess.session) {
        router.push("/creator");
        router.refresh();
      } else {
        router.push("/login?check=1");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input required placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} pattern="[a-zA-Z0-9_]{3,30}" title="3–30 characters: letters, numbers, underscore" autoComplete="username" />
      <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <Input type="password" required placeholder="Password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" />
      {params.get("ref") && <p className="text-xs text-champagne">Invited by @{params.get("ref")}</p>}
      <p className="text-xs leading-relaxed text-mist">
        By joining you confirm you are 18+ and accept the{" "}
        <Link href="/terms" className="text-champagne hover:underline">Terms</Link> and{" "}
        <Link href="/privacy" className="text-champagne hover:underline">Privacy Policy</Link>.
      </p>
      {err && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
      <Button type="submit" loading={loading} className="w-full" size="lg">Create account</Button>
      <p className="text-center text-xs text-mist">
        Already a member? <Link href="/login" className="text-champagne hover:underline">Sign in</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { supabaseBrowser } = await import("@/lib/supabase-browser");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/reset-password`,
      });
      if (!error) setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <p className="text-sm text-mist">If an account exists for <span className="text-white">{email}</span>, a reset link is on its way. Check your inbox.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input type="email" required placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit" loading={loading} className="w-full" size="lg">Send reset link</Button>
      <p className="text-center text-xs text-mist"><Link href="/login" className="hover:text-champagne">Back to sign in</Link></p>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { supabaseBrowser } = await import("@/lib/supabase-browser");
      const { error } = await supabaseBrowser().auth.updateUser({ password });
      if (error) setErr(error.message);
      else {
        setDone(true);
        setTimeout(() => router.push("/creator"), 1500);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input type="password" required placeholder="New password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" />
      {err && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
      {done && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">Password updated. Redirecting…</p>}
      <Button type="submit" loading={loading} className="w-full" size="lg">Update password</Button>
    </form>
  );
}
