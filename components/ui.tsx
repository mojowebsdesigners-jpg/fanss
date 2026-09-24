"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

/* ─── Button ──────────────────────────────────────────────────────────── */
export function Button({
  variant = "gold",
  size = "md",
  className,
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "gold" | "ghost" | "danger" | "subtle";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all select-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne/60";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base",
  } as const;
  const variants = {
    gold: "btn-gold",
    ghost: "btn-ghost text-white/90",
    danger: "bg-rose-600/90 text-white hover:bg-rose-600",
    subtle: "bg-white/5 border border-line text-white/80 hover:bg-white/10",
  } as const;
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} disabled={loading || props.disabled} {...props}>
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      )}
      {children}
    </button>
  );
}

/* ─── Inputs ──────────────────────────────────────────────────────────── */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input-dark", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input-dark min-h-24 resize-y", className)} {...props} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-mist">{label}</span>
      {children}
      {hint && <span className="block text-xs text-mist/70">{hint}</span>}
    </label>
  );
}

/* ─── Card / Badge / Avatar ───────────────────────────────────────────── */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("glass rounded-2xl", className)}>{children}</div>;
}

export function Badge({ children, tone = "gold", className }: { children: ReactNode; tone?: "gold" | "green" | "red" | "gray" | "violet"; className?: string }) {
  const tones = {
    gold: "bg-champagne/10 text-champagne border-champagne/30",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    red: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    gray: "bg-white/5 text-mist border-line",
    violet: "bg-violet/10 text-violet border-violet/30",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Avatar({ src, name, size = 40, className }: { src?: string | null; name?: string | null; size?: number; className?: string }) {
  const [err, setErr] = useState(false);
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-champagne/30 to-violet/30 font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? "avatar"} className="h-full w-full object-cover" onError={() => setErr(true)} />
      ) : (
        initial
      )}
    </span>
  );
}

/* ─── Skeleton / Empty ────────────────────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
      {icon && <div className="mb-4 text-mist/60">{icon}</div>}
      <h3 className="font-display text-lg text-white/90">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-mist">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ─── Modal ───────────────────────────────────────────────────────────── */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "glass-strong relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl p-6 shadow-2xl animate-scale-in sm:rounded-3xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-mist transition hover:bg-white/10 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ─── Tabs ────────────────────────────────────────────────────────────── */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-white/[0.03] p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "whitespace-nowrap rounded-lg px-4 py-2 text-sm transition",
            active === t.id ? "bg-white/10 font-medium text-white" : "text-mist hover:text-white"
          )}
        >
          {t.label}
          {typeof t.count === "number" && <span className="ml-1.5 text-xs text-mist/70">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ─── Toasts ──────────────────────────────────────────────────────────── */
type Toast = { id: number; message: string; kind: "success" | "error" | "info" };
const ToastCtx = createContext<(message: string, kind?: Toast["kind"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-24 left-1/2 z-[200] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-8">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "glass-strong pointer-events-auto rounded-xl px-4 py-3 text-sm shadow-xl animate-fade-up",
              t.kind === "success" && "border-emerald-500/40 text-emerald-200",
              t.kind === "error" && "border-rose-500/40 text-rose-200",
              t.kind === "info" && "text-white/90"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
