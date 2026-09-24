import Link from "next/link";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <Link href="/" className="font-display text-3xl gold-text">LUMINA</Link>
        <h1 className="mt-6 font-display text-3xl text-white">{title}</h1>
        <p className="mt-2 text-sm text-mist">{subtitle}</p>
      </div>
      <div className="glass rounded-3xl p-8">{children}</div>
    </div>
  );
}
