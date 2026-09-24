export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="font-display text-4xl text-white">{title}</h1>
      <p className="mt-2 text-xs uppercase tracking-wider text-mist">Last updated {updated}</p>
      <div className="legal-prose mt-8 space-y-4 text-sm leading-relaxed text-mist [&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-lg [&_h3]:text-white [&_li]:ml-5 [&_li]:list-disc [&_p+a]:mt-3">
        {children}
      </div>
    </div>
  );
}
