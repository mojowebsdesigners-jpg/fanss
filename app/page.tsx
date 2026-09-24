import Link from "next/link";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase";
import { money } from "@/lib/format";
import { lockedPlaceholder } from "@/lib/placeholder";

export const metadata: Metadata = {
  title: "Lumina — Step inside the exclusive world",
};

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await supabaseServer();

  const [{ data: creator }, { data: plan }, { data: promo }, { data: featured }] = await Promise.all([
    supabase.from("creator_profiles").select("profile:profiles(username, display_name, avatar_url, bio), tagline, verification_status").maybeSingle(),
    supabase.from("subscription_plans").select("name, price, currency, benefits").eq("active", true).order("sort_order").limit(1).maybeSingle(),
    supabase.from("promotions").select("banner_text, discount_pct").eq("active", true).limit(1).maybeSingle(),
    supabase
      .from("posts")
      .select("id, title, caption, visibility, price, published_at")
      .eq("status", "published")
      .not("published_at", "is", null)
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(6),
  ]);

  const [{ count: subsCount }, { count: postsCount }] = await Promise.all([
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "published"),
  ]);

  const creatorProfile = creator?.profile as { username: string; display_name: string | null; avatar_url: string | null; bio: string | null } | undefined;
  const planData = plan as { name: string; price: number; benefits: string[] } | null;
  const promoData = promo as { banner_text: string | null; discount_pct: number } | null;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-b from-violet/25 via-ink/60 to-ink"
          aria-hidden
        />
        <div
          className="absolute -top-32 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(139,124,246,0.5), transparent)" }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-16 md:grid-cols-2 md:items-center md:pt-24">
          <div className="animate-fade-up">
            {promoData?.banner_text && (
              <span className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-champagne">
                ✦ {promoData.banner_text}
              </span>
            )}
            <h1 className="font-display text-5xl leading-[1.05] text-white md:text-6xl">
              Step inside <span className="gold-text">{creatorProfile?.display_name ?? "the world"}</span>&rsquo;s private universe.
            </h1>
            <p className="mt-5 max-w-md text-lg text-mist">
              {creatorProfile?.bio ?? creator?.tagline ?? "Exclusive content, intimate drops and a direct line to me."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-gold rounded-xl px-8 py-3.5 text-base">Subscribe</Link>
              <Link href="/creator" className="btn-ghost rounded-xl px-8 py-3.5 text-base text-white">Explore</Link>
            </div>
            <div className="mt-10 flex gap-8 text-sm text-mist">
              <Stat value={subsCount ?? 0} label="members" />
              <Stat value={postsCount ?? 0} label="posts" />
              <Stat value={4.9} label="rating" decimal />
            </div>
          </div>
          <div className="relative animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="glass relative aspect-[4/5] overflow-hidden rounded-3xl">
              {creatorProfile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={creatorProfile.avatar_url} alt={creatorProfile.display_name ?? "creator"} className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lockedPlaceholder("hero-" + (creatorProfile?.username ?? "lumina"))} alt="" className="h-full w-full" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                <p className="font-display text-2xl text-white">{creatorProfile?.display_name ?? "Lumina"}</p>
                <p className="text-sm text-mist">@{creatorProfile?.username ?? "creator"}</p>
              </div>
            </div>
            <div className="glass absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl px-4 py-3 md:flex">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="text-sm font-medium text-white">Exclusive drops weekly</p>
                <p className="text-xs text-mist">Subscribers see everything first</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured content */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <SectionHead title="Fresh from the feed" subtitle="A taste of what's waiting inside." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured?.map((p) => <FeedCard key={p.id} post={p} />)}
          {!featured?.length && (
            <p className="text-mist">New content is on its way — check back soon.</p>
          )}
          {featured?.length ? (
            <Link href="/feed" className="card-hover glass flex min-h-44 items-center justify-center rounded-2xl text-sm text-champagne">
              View the full feed →
            </Link>
          ) : null}
        </div>
      </section>

      {/* Subscription benefits */}
      <section className="border-y border-line bg-ink-2/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
          <div>
            <SectionHead title={planData?.name ?? "Exclusive membership"} subtitle="Everything subscribers get, the moment they join." />
            <ul className="mt-6 space-y-3 text-sm text-mist">
              {(planData?.benefits ?? []).map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 text-champagne">✓</span> {b}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-gold mt-8 inline-block rounded-xl px-7 py-3">Subscribe — {planData ? money(planData.price) : ""}/mo</Link>
          </div>
          <div className="glass rounded-3xl p-8">
            <p className="text-xs uppercase tracking-widest text-mist">Membership</p>
            <p className="mt-2 font-display text-4xl text-white">
              {planData ? money(planData.price) : "—"}
              <span className="text-base text-mist"> / month</span>
            </p>
            <div className="mt-6 space-y-3 border-t border-line pt-6 text-sm text-mist">
              <p className="flex justify-between"><span>Subscriber-only feed</span><span>✓</span></p>
              <p className="flex justify-between"><span>Exclusive photo &amp; video sets</span><span>✓</span></p>
              <p className="flex justify-between"><span>Private messaging</span><span>✓</span></p>
              <p className="flex justify-between"><span>Pay-per-view unlocks</span><span>✓</span></p>
              <p className="flex justify-between"><span>Tip the creator</span><span>✓</span></p>
            </div>
            <p className="mt-6 text-xs text-mist/70">
              Paid in cryptocurrency. Access is activated automatically after payment confirmation — usually within minutes.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <SectionHead title="Questions, answered" subtitle="Everything you need to know before stepping inside." align="center" />
        <Faq />
      </section>
    </div>
  );
}

function Stat({ value, label, decimal }: { value: number; label: string; decimal?: boolean }) {
  return (
    <div>
      <p className="font-display text-2xl text-white">{decimal ? value.toFixed(1) : (value ?? 0).toLocaleString()}</p>
      <p className="text-xs uppercase tracking-wider">{label}</p>
    </div>
  );
}

function SectionHead({ title, subtitle, align }: { title: string; subtitle?: string; align?: string }) {
  return (
    <div className={align === "center" ? "mb-8 text-center" : "mb-8"}>
      <h2 className="font-display text-3xl text-white">{title}</h2>
      {subtitle && <p className="mt-2 text-mist">{subtitle}</p>}
    </div>
  );
}

function FeedCard({ post }: { post: { id: string; title: string | null; caption: string; visibility: string; price: number | null } }) {
  const locked = post.visibility === "PPV" || post.visibility === "SUBSCRIBERS";
  return (
    <Link href={`/post/${post.id}`} className="card-hover glass block overflow-hidden rounded-2xl">
      <div
        className="aspect-[4/3] w-full"
        style={{ backgroundImage: `url("${lockedPlaceholder(post.id)}")`, backgroundSize: "cover" }}
      />
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium text-white">{post.title ?? "Untitled"}</p>
          {locked && <span className="text-champagne">🔒</span>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-mist">{post.caption}</p>
        {post.visibility === "PPV" && post.price && (
          <p className="mt-2 text-xs text-champagne">Unlock for {money(post.price)}</p>
        )}
      </div>
    </Link>
  );
}

function Faq() {
  const items = [
    ["How do payments work?", "Everything is paid in cryptocurrency through our payment provider. After your transaction confirms on-chain, your subscription or unlock activates automatically — usually within minutes."],
    ["Do purchases expire?", "Never. Anything you buy individually — PPV posts, bundles, paid messages — stays in your library forever, even if your subscription lapses."],
    ["Can I message the creator?", "Yes. Once you're a member you can send a private message, and the creator can reply with free or premium content."],
    ["Is my privacy protected?", "Your email and payment details are never shown publicly. Premium media is served through short-lived private links only."],
  ];
  return (
    <div className="space-y-3">
      {items.map(([q, a]) => (
        <details key={q} className="glass group rounded-2xl px-5 py-4">
          <summary className="cursor-pointer list-none text-sm font-medium text-white marker:hidden">
            <span className="mr-2 text-champagne transition group-open:rotate-45 inline-block">+</span>
            {q}
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-mist">{a}</p>
        </details>
      ))}
    </div>
  );
}
