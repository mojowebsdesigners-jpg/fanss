import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { canAccessPost } from "@/lib/access";
import { lockedPlaceholder } from "@/lib/placeholder";
import { PostView } from "@/components/post-view";

export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };

async function getPost(id: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("posts")
    .select("id, creator_id, title, caption, visibility, price, tags, status, deleted_at, published_at, like_count, comment_count")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post || post.status !== "published") return { title: "Post", robots: { index: false } };
  const indexable = post.visibility === "PUBLIC";
  return {
    title: post.title ?? "Post",
    description: post.caption.slice(0, 150),
    robots: indexable ? undefined : { index: false, follow: false },
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post || post.status !== "published" || post.deleted_at) notFound();

  const user = await getSessionUser();
  if (post.visibility === "REGISTERED" && !user) {
    return <LockedGate title="Members only" body="Sign in or join free to view this post." cta="Join free" href="/signup" />;
  }

  const accessible = await canAccessPost(user?.id ?? null, post.id);

  return (
    <PostView
      postId={post.id}
      title={post.title}
      caption={post.caption}
      visibility={post.visibility}
      price={post.price}
      tags={post.tags}
      when={post.published_at}
      accessible={accessible}
      signedIn={!!user}
      isOwner={user?.id === post.creator_id}
      placeholder={lockedPlaceholder(post.id)}
    />
  );
}

function LockedGate({ title, body, cta, href }: { title: string; body: string; cta: string; href: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-display text-3xl text-white">{title}</h1>
      <p className="mt-3 text-mist">{body}</p>
      <a href={href} className="btn-gold mt-8 inline-block rounded-xl px-8 py-3">{cta}</a>
    </div>
  );
}
