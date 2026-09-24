import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl gold-text">404</p>
      <h1 className="mt-4 font-display text-2xl text-white">This page slipped away</h1>
      <p className="mt-2 max-w-sm text-sm text-mist">The content you're looking for doesn't exist, was removed, or is private.</p>
      <Link href="/" className="btn-gold mt-8 rounded-xl px-7 py-3 text-sm">Back home</Link>
    </div>
  );
}
