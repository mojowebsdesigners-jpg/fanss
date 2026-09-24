import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { hasActiveSubscription, getPlatformSettings } from "@/lib/access";
import { money } from "@/lib/format";
import { lockedPlaceholder } from "@/lib/placeholder";
import { CreatorTabs } from "@/components/creator-tabs";
import { Badge } from "@/components/ui";
import { BadgeCheck, Instagram, Link2, MessageCircle, Music2, HandCoins, Twitter, Youtube } from "lucide-react";
import { TipModal } from "@/components/tip-modal";

export const revalidate = 30;

type Props = { params: Promise<{ username?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await supabaseServer();
  let query = supabase
    .from("creator_profiles")
    .select("profile:profiles(username, display_name, bio, avatar_url)")
    .limit(1);
  if (username?.[0]) query = query.eq("profile.username", username[0]);
  const { data } = await query.maybeSingle();
  const profile = data?.profile as { display_name: string | null; bio: string | null; username: string } | undefined;
  if (!profile) return { title: "Creator" };
  return {
    title: `${profile.display_name ?? profile.username} — Exclusive Content`,
    description: profile.bio ?? "Exclusive content, private messaging and premium drops.",
    openGraph: { title: profile.display_name ?? "Creator", description: profile.bio ?? "" },
  };
}

export default async function CreatorPage({ searchParams }: Props & { searchParams: Promise<{ tab?: string; before?: string }> }) {
  const { tab, before } = await searchParams;
  const supabase = await supabaseServer();
  const user = await getSessionUser();

  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("profile:profiles(id, username, display_name, bio, avatar_url), tagline, about, cover_url, verification_status, social_links")
    .limit(1)
    .maybeSingle();

  if (!creator) notFound();
  const profile = creator.profile as unknown as {
    id: string; username: string; display_name: string | null; bio: string | null; avatar_url: string | null;
  };
  const socials = (creator.social_links ?? {}) as Record<string, string>;
  const subscribed = user ? await hasActiveSubscription(user.id) : false;
  const settings = await getPlatformSettings();

  // feed query
  const pageSize = 12;
  let q = supabase
    .from("posts")
    .select("id, title, caption, visibility, price, preview_asset_id, like_count, comment_count, published_at, tags")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(pageSize + 1);
  if (before) q = q.lt("published_at", before);
  const { data: posts } = await q;

  const hasMore = (posts?.length ?? 0) > pageSize;
  const feed = (posts ?? []).slice(0, pageSize);
  const [{ count: subsCount }, { count: mediaCount }] = await Promise.all([
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("media_assets").select("id", { count: "exact", head: true }).eq("creator_id", profile.id).is("deleted_at", null),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* ── Cinematic header ── */}
      <div className="relative -mx-4 overflow-hidden">
        <div className="relative h-52 md:h-72">
          {creator.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet/30 via-ink-3 to-ink" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        </div>
        <div className="relative -mt-16 px-4 pb-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end">
            <div className="relative">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name ?? ""} className="h-32 w-32 rounded-full border-4 border-ink object-cover shadow-2xl" />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-ink bg-gradient-to-br from-champagne/40 to-violet/40 font-display text-4xl">
                  {(profile.display_name ?? "A").charAt(0)}
                </div>
              )}
              {creator.verification_status === "VERIFIED" && (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-ink p-1">
                  <BadgeCheck size={26} className="text-champagne" />
                </span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-display text-3xl text-white md:text-4xl">{profile.display_name ?? profile.username}</h1>
              <p className="text-sm text-mist">@{profile.username} · {subsCount ?? 0} members · {mediaCount ?? 0} media</p>
              {creator.tagline && <p className="mt-1 max-w-lg text-sm text-white/80">{creator.tagline}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(socials).map(([k, v]) => (
                  <a key={k} href={v} target="_blank" rel="noopener noreferrer nofollow" className="glass rounded-full p-2 text-mist transition hover:text-champagne" aria-label={k}>
                    {k === "instagram" ? <Instagram size={15} /> : k === "x" || k === "twitter" ? <Twitter size={15} /> : k === "tiktok" ? <Music2 size={15} /> : k === "youtube" ? <Youtube size={15} /> : <Link2 size={15} />}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              {user ? (
                <>
                  {user.id !== profile.id && (
                    <Link href="/messages" className="btn-ghost flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-white">
                      <MessageCircle size={16} /> Message
                    </Link>
                  )}
                </>
              ) : (
                <Link href="/signup" className="btn-ghost flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-white">
                  <MessageCircle size={16} /> Message
                </Link>
              )}
              {user && (
                <TipModal
                  trigger={
                    <button className="btn-ghost flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-white">
                      <HandCoins size={16} /> Tip
                    </button>
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Subscription card ── */}
      <SubscribeCard
        subscribed={subscribed}
        signedIn={!!user}
        planName="Lumina Exclusive"
        benefits={[
          "Unlimited subscriber-only posts",
          "Exclusive photo sets & videos",
          "Direct private messaging",
          "Members-only offers",
          "Early access to new drops",
        ]}
      />

      {/* ── Content tabs ── */}
      <CreatorTabs
        initialTab={tab ?? "posts"}
        posts={feed.map((p) => ({
          id: p.id,
          title: p.title,
          caption: p.caption,
          visibility: p.visibility,
          price: p.price,
          preview: null, // previews resolve client-side via signed URLs
          placeholder: lockedPlaceholder(p.id),
          likes: p.like_count,
          comments: p.comment_count,
          when: p.published_at,
        }))}
        about={creator.about ?? profile.bio ?? ""}
      />

      {hasMore && (
        <div className="pb-16 pt-2 text-center">
          <Link
            href={`/creator?tab=${tab ?? "posts"}&before=${encodeURIComponent(feed[feed.length - 1]?.published_at ?? "")}`}
            className="btn-ghost rounded-xl px-6 py-2.5 text-sm text-white"
          >
            Load more
          </Link>
        </div>
      )}
    </div>
  );
}

function SubscribeCard({
  subscribed,
  signedIn,
  planName,
  benefits,
}: {
  subscribed: boolean;
  signedIn: boolean;
  planName: string;
  benefits: string[];
}) {
  return (
    <section className="glass my-8 overflow-hidden rounded-3xl">
      <div className="grid gap-0 md:grid-cols-[1fr_320px]">
        <div className="p-6 md:p-8">
          <h2 className="font-display text-2xl text-white">{planName}</h2>
          <ul className="mt-4 grid gap-2.5 text-sm text-mist sm:grid-cols-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="text-champagne">✓</span> {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 border-t border-line bg-white/[0.02] p-6 md:border-l md:border-t-0">
          {subscribed ? (
            <>
              <Badge tone="green">Subscription active</Badge>
              <p className="text-center text-xs text-mist">You have full access to subscriber content.</p>
            </>
          ) : (
            <>
              <Link href={signedIn ? "/subscribe" : "/signup"} className="btn-gold w-full rounded-xl px-6 py-3 text-center text-sm">
                Subscribe
              </Link>
              <p className="text-center text-xs text-mist">Crypto payments · instant activation after confirmation</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
