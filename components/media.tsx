"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Lock, Play, Pause, Maximize, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "./ui";
import { cn } from "@/lib/format";

export type MediaItem =
  | { kind: "image"; url: string; alt?: string }
  | { kind: "video"; url: string; poster?: string | null };

/* ─── Anti-download protection ────────────────────────────────────────── */
/**
 * "What stays in the app stays in the app" client hardening.
 *
 * This is DETERRENT layering on top of the real security boundary (the
 * authenticated streaming proxy in /api/media/[id]/file, which makes any
 * copied URL worthless). Blocks: right-click open/save, drag-out, iOS long-
 * press save callouts, selection/copy of media, print, and common save
 * shortcuts. Honest limit: a screenshot cannot be prevented by any website.
 */
export function useMediaProtection() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      // save page / save image / print
      if (mod && (k === "s" || k === "p")) e.preventDefault();
      // devtools shortcuts — nuisance reduction, not security
      if (mod && e.shiftKey && (k === "i" || k === "j" || k === "c")) e.preventDefault();
      if (k === "f12") e.preventDefault();
    };
    document.addEventListener("contextmenu", stop);
    document.addEventListener("dragstart", stop);
    document.addEventListener("copy", stop);
    document.addEventListener("cut", stop);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("contextmenu", stop);
      document.removeEventListener("dragstart", stop);
      document.removeEventListener("copy", stop);
      document.removeEventListener("cut", stop);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
}

/** Diagonal viewer-identity watermark — screenshot forensics, not pixel-burn. */
export function Watermark({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none"
      style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
    >
      <div
        className="absolute -inset-1/4 opacity-[0.13]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='150'><text x='0' y='60' font-family='sans-serif' font-size='13' fill='white' transform='rotate(-24 110 75)'>${text
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")} · Lumina</text></svg>`
          )}")`,
          backgroundRepeat: "repeat",
        }}
      />
    </div>
  );
}

/* ─── Locked preview ──────────────────────────────────────────────────── */
export function LockedMedia({
  placeholder,
  price,
  blurred,
  children,
  onUnlock,
  unlockHref,
}: {
  placeholder?: string;
  price?: number | null;
  blurred?: boolean;
  children?: React.ReactNode;
  onUnlock?: () => void;
  unlockHref?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-ink-3">
      <div
        className={cn("aspect-square w-full", blurred && "blur-md scale-110")}
        style={
          placeholder
            ? { backgroundImage: `url(${placeholder})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-t from-black/80 via-black/30 to-black/50 p-6 text-center">
        <span className="glass-strong flex h-14 w-14 items-center justify-center rounded-full">
          <Lock size={22} className="text-champagne" />
        </span>
        <p className="font-display text-lg text-white">Exclusive content</p>
        {typeof price === "number" && (
          <p className="text-sm text-mist">
            Unlock this content for <span className="font-semibold text-champagne">${price.toFixed(2)}</span>
          </p>
        )}
        {onUnlock || unlockHref ? (
          unlockHref ? (
            <Link href={unlockHref} className="btn-gold rounded-xl px-6 py-2.5 text-sm">Unlock now</Link>
          ) : (
            <Button onClick={onUnlock}>Unlock now</Button>
          )
        ) : null}
      </div>
    </div>
  );
}

/* ─── Lightbox ────────────────────────────────────────────────────────── */
export function Lightbox({
  items,
  index,
  onClose,
  onIndex,
  watermark,
}: {
  items: MediaItem[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
  watermark?: string;
}) {
  useMediaProtection();
  const item = items[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % items.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + items.length) % items.length);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, items.length, onClose, onIndex]);

  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-black/95 backdrop-blur-sm animate-scale-in">
      <div className="flex items-center justify-between p-4">
        <span className="text-sm text-mist">
          {index + 1} / {items.length}
        </span>
        <button onClick={onClose} className="rounded-full p-2 text-white/80 hover:bg-white/10" aria-label="Close viewer">
          <X size={22} />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-6">
        {items.length > 1 && (
          <button
            onClick={() => onIndex((index - 1 + items.length) % items.length)}
            className="absolute left-3 z-10 rounded-full bg-white/5 p-3 text-white hover:bg-white/15"
            aria-label="Previous"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {item.kind === "image" ? (
          <span className="relative inline-flex max-h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.alt ?? ""}
              draggable={false}
              className="max-h-full max-w-full rounded-xl object-contain select-none"
              style={{ WebkitTouchCallout: "none", WebkitUserDrag: "none" } as React.CSSProperties}
            />
            {watermark ? <Watermark text={watermark} /> : null}
          </span>
        ) : (
          <VideoPlayer src={item.url} poster={item.poster} autoPlay watermark={watermark} className="max-h-full" />
        )}
        {items.length > 1 && (
          <button
            onClick={() => onIndex((index + 1) % items.length)}
            className="absolute right-3 z-10 rounded-full bg-white/5 p-3 text-white hover:bg-white/15"
            aria-label="Next"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Video player ────────────────────────────────────────────────────── */
export function VideoPlayer({
  src,
  poster,
  autoPlay,
  className,
  watermark,
}: {
  src: string;
  poster?: string | null;
  autoPlay?: boolean;
  className?: string;
  watermark?: string;
}) {
  useMediaProtection();
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }, []);

  return (
    <div className={cn("group relative overflow-hidden rounded-2xl bg-black", className)}>
      <video
        ref={ref}
        src={src}
        poster={poster ?? undefined}
        autoPlay={autoPlay}
        playsInline
        loop={false}
        className="h-full w-full object-contain"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setProgress(v.duration ? v.currentTime / v.duration : 0);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      />
      {watermark ? <Watermark text={watermark} /> : null}
      {!playing && (
        <button
          onClick={toggle}
          className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full glass-strong transition hover:scale-105"
          aria-label="Play"
        >
          <Play size={26} className="ml-1 text-champagne" />
        </button>
      )}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
        <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="text-white">
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <span className="text-xs tabular-nums text-white/80">
          {fmtTime(progress * duration)} / {fmtTime(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => {
            const v = ref.current;
            if (v?.duration) v.currentTime = parseFloat(e.target.value) * v.duration;
          }}
          className="h-1 flex-1 accent-[#e8c87f]"
          aria-label="Seek"
        />
        <button
          onClick={() => {
            const v = ref.current;
            if (v) {
              v.muted = !v.muted;
              setMuted(v.muted);
            }
          }}
          className="text-white"
          aria-label="Mute"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button onClick={() => ref.current?.requestFullscreen?.()} className="text-white" aria-label="Fullscreen">
          <Maximize size={18} />
        </button>
      </div>
    </div>
  );
}

function fmtTime(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* ─── Gallery grid ────────────────────────────────────────────────────── */
export function MediaGallery({
  items,
  onOpen,
  watermark,
}: {
  items: MediaItem[];
  onOpen?: (i: number) => void;
  watermark?: string;
}) {
  useMediaProtection();
  const [lb, setLb] = useState<number | null>(null);
  if (items.length === 0) return null;
  return (
    <>
      <div className={cn("grid gap-2", items.length === 1 ? "grid-cols-1" : items.length === 2 ? "grid-cols-2" : "grid-cols-2")}>
        {items.slice(0, 4).map((m, i) => (
          <button
            key={i}
            onClick={() => (onOpen ? onOpen(i) : setLb(i))}
            className="group relative overflow-hidden rounded-xl bg-ink-3"
          >
            {m.kind === "image" ? (
              <span className="relative block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105 select-none"
                  style={{ WebkitTouchCallout: "none", WebkitUserDrag: "none" } as React.CSSProperties}
                />
                {watermark ? <Watermark text={watermark} /> : null}
              </span>
            ) : (
              <span className="relative block aspect-square w-full">
                {m.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.poster} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="block h-full w-full bg-ink-3" />
                )}
                <span className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full glass-strong">
                  <Play size={20} className="ml-0.5 text-champagne" />
                </span>
              </span>
            )}
            {i === 3 && items.length > 4 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-semibold text-white">
                +{items.length - 4}
              </span>
            )}
          </button>
        ))}
      </div>
      {lb !== null && <Lightbox items={items} index={lb} onClose={() => setLb(null)} onIndex={setLb} watermark={watermark} />}
    </>
  );
}
