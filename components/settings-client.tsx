"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, Avatar, useToast, Modal } from "./ui";

export function SettingsClient({
  profile,
}: {
  profile: {
    username: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    email: string;
    notifEmail: boolean;
    notifInApp: boolean;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState({ next: "", confirm: "" });
  const [emailNotif, setEmailNotif] = useState(profile.notifEmail);
  const [inAppNotif, setInAppNotif] = useState(profile.notifInApp);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio }),
      });
      const json = await res.json();
      toast(json.success ? "Profile saved" : json.error?.message ?? "Save failed", json.success ? "success" : "error");
      if (json.success) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/account/avatar", { method: "POST", body: form });
    const json = await res.json();
    toast(json.success ? "Avatar updated" : json.error?.message ?? "Upload failed", json.success ? "success" : "error");
    if (json.success) router.refresh();
  }

  async function changePassword() {
    if (password.next !== password.confirm) {
      toast("Passwords don't match", "error");
      return;
    }      const { supabaseBrowser } = await import("@/lib/supabase-browser");
      const { error } = await supabaseBrowser().auth.updateUser({ password: password.next });
    toast(error ? error.message : "Password updated", error ? "error" : "success");
    if (!error) setPassword({ next: "", confirm: "" });
  }

  async function saveNotifs(email: boolean, inApp: boolean) {
    setEmailNotif(email);
    setInAppNotif(inApp);
    await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifPreferences: { email, inApp } }),
    });
  }

  async function deleteAccount() {
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: deleteText }),
    });
    const json = await res.json();
    if (json.success) {
      toast("Account scheduled for deletion", "info");
      router.push("/");
    } else {
      toast(json.error?.message ?? "Could not delete account", "error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl text-white">Settings</h1>

      {/* profile */}
      <section className="glass mt-8 rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mist">Profile</h2>
        <div className="mb-5 flex items-center gap-4">
          <Avatar src={profile.avatarUrl} name={profile.displayName ?? profile.username} size={64} />
          <div>
            <Button variant="ghost" size="sm" className="text-white" onClick={() => fileRef.current?.click()}>Change photo</Button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            <p className="mt-1 text-xs text-mist">PNG, JPG or WebP · max 5 MB</p>
          </div>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">Username</span>
            <Input value={profile.username} disabled />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">Display name</span>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">Bio</span>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} />
          </label>
          <Button onClick={saveProfile} loading={saving}>Save profile</Button>
        </div>
      </section>

      {/* security */}
      <section className="glass mt-6 rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mist">Password</h2>
        <div className="space-y-3">
          <Input type="password" placeholder="New password" value={password.next} onChange={(e) => setPassword((p) => ({ ...p, next: e.target.value }))} minLength={8} />
          <Input type="password" placeholder="Confirm new password" value={password.confirm} onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))} minLength={8} />
          <Button variant="ghost" className="text-white" onClick={changePassword} disabled={!password.next}>Update password</Button>
        </div>
      </section>

      {/* notifications */}
      <section className="glass mt-6 rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mist">Notifications</h2>
        <Toggle label="Email notifications" checked={emailNotif} onChange={(v) => saveNotifs(v, inAppNotif)} />
        <Toggle label="In-app notifications" checked={inAppNotif} onChange={(v) => saveNotifs(emailNotif, v)} />
      </section>

      {/* danger zone */}
      <section className="mt-6 rounded-3xl border border-rose-500/25 bg-rose-500/[0.04] p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-rose-300">Danger zone</h2>
        <p className="mb-4 text-xs text-mist">
          Deleting your account removes your profile, messages and saved content. Payment records are
          retained where legally required.
        </p>
        <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete account</Button>
      </section>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete account">
        <p className="text-sm text-mist">Type <span className="font-mono text-white">DELETE</span> to confirm. This cannot be undone.</p>
        <Input className="mt-3" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} />
        <Button variant="danger" className="mt-4 w-full" disabled={deleteText !== "DELETE"} onClick={deleteAccount}>
          Permanently delete
        </Button>
      </Modal>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2">
      <span className="text-sm text-white/85">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-champagne" : "bg-white/15"}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
