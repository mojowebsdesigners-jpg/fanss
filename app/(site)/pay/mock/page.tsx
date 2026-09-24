import { MockCheckout } from "@/components/mock-checkout";

export const metadata = { title: "Sandbox checkout", robots: { index: false } };

export default function MockPayPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; amount?: string; desc?: string }>;
}) {
  return <MockCheckout />;
}
