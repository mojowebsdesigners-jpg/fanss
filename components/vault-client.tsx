"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FolderPlus, Search, Trash2, Upload, X, Image as ImageIcon, Video, Tag,
  Folder, ChevronDown, Loader2, Pencil,
} from "lucide-react";
import { Button, Input, Modal, EmptyState, useToast } from "./ui";
import { cn } from "@/lib/format";

type Asset = {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  duration: number | null;
  folder_id: string | null;
  tags: string[];
  created_at: string;
  url: string | null;
  video: boolean;
};

type FolderRow = { id: string; name: string };

export function VaultClient() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [preview, setPreview] = useState<Asset | null>(null);
  const [tagging, setTagging] = useState<Asset | null>(null);
  const [tagText, setTagText] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const loadAssets = useCallback(async () => {
    const params = new URLSearchParams();
    if (activeFolder !== "all") params.set("folder", activeFolder);
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    const res = await fetch(`/api/vault?${params}`);
    const json = await res.json();
    if (json.success) setAssets(json.data.assets);
    setLoading(false);
  }, [activeFolder, search, typeFilter]);

  const loadFolders = useCallback(async () => {
    const res = await fetch("/api/vault/folders");
    const json = await res.json();
    if (json.success) setFolders(json.data.folders);
  }, []);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);
  useEffect(() => {
    const t = setTimeout(() => void loadAssets(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadAssets, search]);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    setUploading({ done: 0, total: list.length });
    let okCount = 0;
    for (const [i, f] of list.entries()) {
      const form = new FormData();
      form.append("file", f);
      if (activeFolder !== "all") form.append("folderId", activeFolder);
      const res = await fetch("/api/vault/upload", { method: "POST", body: form });
      const json = await res.json();
      if (json.success) okCount++;
      setUploading({ done: i + 1, total: list.length });
    }
    setUploading(null);
    if (okCount > 0) {
      toast(`Uploaded ${okCount} file${okCount > 1 ? "s" : ""}`, "success");
      void loadAssets();
    } else {
      toast("Upload failed — check the file type and size.", "error");
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} item${selected.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    await fetch(`/api/vault?ids=${[...selected].join(",")}`, { method: "DELETE" });
    setSelected(new Set());
    toast("Deleted", "success");
    void loadAssets();
  }

  async function createFolder() {
    const res = await fetch("/api/vault/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: folderName }),
    });
    const json = await res.json();
    if (json.success) {
      setNewFolderOpen(false);
      setFolderName("");
      void loadFolders();
    } else {
      toast(json.error?.message ?? "Could not create folder", "error");
    }
  }

  async function saveTags() {
    if (!tagging) return;
    const tags = tagText.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    await fetch("/api/vault", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tagging.id, tags }),
    });
    setTagging(null);
    toast("Tags saved", "success");
    void loadAssets();
  }

  function fmtSize(bytes: number) {
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-white">Media Vault</h1>
          <p className="text-sm text-mist">Private storage for everything you publish.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="text-white" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus size={15} /> New folder
          </Button>
          <Button onClick={() => fileInput.current?.click()}>
            <Upload size={15} /> Upload
          </Button>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => e.target.files && upload(e.target.files)}
      />

      {/* toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
          <input className="input-dark pl-9" placeholder="Search by filename…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-dark w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
          <option value="all">All types</option>
          <option value="image">Photos</option>
          <option value="video">Videos</option>
        </select>
        {selected.size > 0 && (
          <Button variant="danger" size="sm" onClick={bulkDelete}>
            <Trash2 size={14} /> Delete {selected.size}
          </Button>
        )}
      </div>

      {/* folders row */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={() => setActiveFolder("all")}
          className={cn("rounded-full px-3.5 py-1.5 transition", activeFolder === "all" ? "bg-champagne/15 text-champagne" : "glass text-mist hover:text-white")}
        >
          All media
        </button>
        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFolder(f.id)}
            className={cn("flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition", activeFolder === f.id ? "bg-champagne/15 text-champagne" : "glass text-mist hover:text-white")}
          >
            <Folder size={13} /> {f.name}
          </button>
        ))}
      </div>

      {/* dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-3xl border-2 border-dashed p-1 transition",
          dragOver ? "border-champagne bg-champagne/5" : "border-transparent"
        )}
      >
        {uploading ? (
          <div className="glass flex items-center justify-center gap-3 rounded-2xl py-14">
            <Loader2 className="animate-spin text-champagne" size={20} />
            <span className="text-sm text-white">Uploading {uploading.done}/{uploading.total}…</span>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton aspect-square" />)}
          </div>
        ) : assets.length === 0 ? (
          <EmptyState
            icon={<ImageIcon size={36} />}
            title="Your vault is empty"
            body="Drag & drop photos or videos here, or click Upload. Everything stays private until you publish it."
            action={<Button onClick={() => fileInput.current?.click()}>Upload media</Button>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {assets.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-xl border bg-ink-3 transition",
                  selected.has(a.id) ? "border-champagne" : "border-line hover:border-line-strong"
                )}
              >
                <button className="block h-full w-full" onClick={() => setPreview(a)}>
                  {a.video ? (
                    <video src={a.url ?? ""} className="h-full w-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url ?? ""} alt={a.filename} loading="lazy" className="h-full w-full object-cover" />
                  )}
                </button>
                <label className="absolute left-2 top-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#e8c87f]"
                    checked={selected.has(a.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(a.id);
                      else next.delete(a.id);
                      setSelected(next);
                    }}
                  />
                </label>
                <button
                  onClick={() => { setTagging(a); setTagText(a.tags.join(", ")); }}
                  className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 opacity-0 transition group-hover:opacity-100"
                  aria-label="Tag"
                >
                  <Tag size={12} className="text-white" />
                </button>
                {a.video && (
                  <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">video</span>
                )}
                {a.tags.length > 0 && (
                  <span className="absolute bottom-2 right-2 rounded bg-champagne/90 px-1.5 py-0.5 text-[9px] font-bold text-black">
                    {a.tags.length}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* new folder modal */}
      <Modal open={newFolderOpen} onClose={() => setNewFolderOpen(false)} title="New folder">
        <div className="space-y-4">
          <Input placeholder="Folder name" value={folderName} onChange={(e) => setFolderName(e.target.value)} maxLength={60} />
          <Button onClick={createFolder} className="w-full">Create folder</Button>
        </div>
      </Modal>

      {/* tag modal */}
      <Modal open={!!tagging} onClose={() => setTagging(null)} title="Tags">
        <div className="space-y-4">
          <Input placeholder="exclusive, premium, photoshoot…" value={tagText} onChange={(e) => setTagText(e.target.value)} />
          <p className="text-xs text-mist">Comma-separated. Tags make vault search and filtering easier.</p>
          <Button onClick={saveTags} className="w-full">Save tags</Button>
        </div>
      </Modal>

      {/* preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.filename ?? ""} wide>
        {preview && (
          <div>
            <div className="overflow-hidden rounded-2xl bg-black">
              {preview.video ? (
                <video src={preview.url ?? ""} controls className="max-h-[60vh] w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url ?? ""} alt={preview.filename} className="max-h-[60vh] w-full object-contain" />
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-mist">
              <span className="glass rounded-lg px-2.5 py-1">{preview.mime_type}</span>
              <span className="glass rounded-lg px-2.5 py-1">{fmtSize(preview.size)}</span>
              {preview.duration && <span className="glass rounded-lg px-2.5 py-1">{Math.round(preview.duration)}s</span>}
              {preview.tags.map((t) => <span key={t} className="rounded-lg bg-champagne/15 px-2.5 py-1 text-champagne">#{t}</span>)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
