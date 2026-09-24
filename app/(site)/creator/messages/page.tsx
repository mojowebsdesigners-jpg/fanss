import { redirect } from "next/navigation";
import { requireCreator } from "@/lib/auth";

export const metadata = { title: "Messages", robots: { index: false } };

export default async function CreatorMessagesPage() {
  await requireCreator();
  redirect("/messages");
}
