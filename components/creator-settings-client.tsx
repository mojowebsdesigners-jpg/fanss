"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Upload } from "lucide-react";
import { Button, Input, Textarea, Badge, useToast } from "./ui";

export function CreatorSettingsClient({
  creator,
  plan,
}: {
  creator: {
    username: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    tagline: string | null;
    about: string | null;
    coverUrl: string | null;
    socials: Record<string, string>;
    verification: string;
  };
  plan: { id: string; name: string; price: number; description: string | null; benefits: string[] } | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tagline, setTagline] = useState(creator.tagline ?? "");
  const [about, setAbout] = useState(creator.about ?? "");
  const [socials, setSocials] = useState(
    Object.entries(creator.socials).map(([k, v]) => ({ key: k, url: v }))
  );
  const [planPrice, setPlanPrice] = useState(plan ? String(plan.price) : "");
  const [planName, setPlanName] = useState(plan?.name ?? "");
  const [planBenefits, setPlanBenefits] = useState(plan?.benefits.join("\n") ?? "");
  const [saving, setSaving] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/creator/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagline,
          about,
          socials: Object.fromEntries(socials.filter((s) => s.key && s.url).map((s) => [s.key.toLowerCase(), s.url])),
          plan: plan ? { id: plan.id, name: planName, price: parseFloat(planPrice) || plan.price, benefits: planBenefits.split("\n").map((b) => b.trim()).filter(Boolean) } : undefined,
        }),
      });
      const json = await res.json();
      toast(json.success ? "Saved" : json.error?.message ?? "Save failed", json.success ? "success" : "error");
      if (json.success) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function uploadCover(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/creator/cover", { method: "POST", body: form });
    const json = await res.json();
    toast(json.success ? "Cover updated" : json.error?.message ?? "Upload failed", json.success ? "success" : "error");
    if (json.success) router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl text-white">Creator settings</h1>
      <p className="mb-6 text-sm text-mist">Your public presence and membership pricing.</p>

      <section className="glass rounded-3xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-mist">Public profile</h2>
          <Badge tone={creator.verification === "VERIFIED" ? "green" : "gold"}>
            <BadgeCheck size={12} /> {creator.verification.toLowerCase()}
          </Badge>
        </div>

        <button
          onClick={() => coverRef.current?.click()}
          className="group relative mb-5 block h-36 w-full overflow-hidden rounded-2xl border border-line"
        >
          {creator.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet/30 via-ink-3 to-ink text-sm text-mist">
              Upload a cover image
            </span>
          )}
          <span className="absolute inset-0 hidden items-center justify-center bg-black/50 group-hover:flex">
            <span className="flex items-center gap-2 text-sm text-white"><Upload size={15} /> Change cover</span>
          </span>
        </button>
        <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">Tagline</span>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120} placeholder="One line that sells the dream" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">About</span>
            <Textarea value={about} onChange={(e) => setAbout(e.target.value)} maxLength={2000} className="min-h-32" />
          </label>
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wider text-mist">Social links</p>
            <div className="space-y-2">
              {socials.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input className="w-32" placeholder="platform" value={s.key}
                    onChange={(e) => setSocials((list) => list.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
                  <Input placeholder="https://…" value={s.url}
                    onChange={(e) => setSocials((list) => list.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-white" onClick={() => setSocials((l) => [...l, { key: "", url: "" }])}>
              + Add link
            </Button>
          </div>
        </div>
      </section>

      {plan && (
        <section className="glass mt-6 rounded-3xl p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mist">Subscription plan</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">Plan name</span>
              <Input value={planName} onChange={(e) => setPlanName(e.target.value)} maxLength={80} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">Monthly price (USD)</span>
              <Input inputMode="decimal" value={planPrice} onChange={(e) => setPlanPrice(e.target.value.replace(/[^0-9.]/g, ""))} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">Benefits (one per line)</span>
              <Textarea value={planBenefits} onChange={(e) => setPlanBenefits(e.target.value)} className="min-h-28" />
            </label>
          </div>
        </section>
      )}

      <Button onClick={save} loading={saving} size="lg" className="mt-6">Save settings</Button>
    </div>
  );
}
