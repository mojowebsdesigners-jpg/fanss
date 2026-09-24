import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { MessagesClient } from "@/components/messages-client";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const user = await requireUser();
  return <MessagesClient currentUserId={user.id} isCreator={user.profile.role === "CREATOR" || user.profile.role === "ADMIN"} initialConversation={c ?? null} viewerName={user.profile.username} />;
}
