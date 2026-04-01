import type { ChangeEvent } from "react";
import { useState, useRef } from "react";
import { X, ImageIcon, Camera, Pencil } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SignalWithAuthor } from "@shared/schema";

const SIGNAL_CATEGORIES = [
  "Politicians", "Corruption", "Current Events", "Legislation",
  "Voting & Elections", "Justice", "Economy", "Community",
];

const THUMB_W = 720;
const THUMB_H = 1280;

async function cropImageTo916(file: File): Promise<{ blob: Blob; dataUrl: string } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = THUMB_W;
      canvas.height = THUMB_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); resolve(null); return; }
      const iW = img.naturalWidth;
      const iH = img.naturalHeight;
      const targetR = THUMB_W / THUMB_H;
      const imgR = iW / iH;
      let sx = 0, sy = 0, sw = iW, sh = iH;
      if (imgR > targetR) { sw = Math.round(iH * targetR); sx = Math.round((iW - sw) / 2); }
      else { sh = Math.round(iW / targetR); sy = Math.round((iH - sh) / 2); }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, THUMB_W, THUMB_H);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      canvas.toBlob((b) => resolve(b ? { blob: b, dataUrl } : null), "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

interface EditSignalModalProps {
  signal: SignalWithAuthor;
  onClose: () => void;
}

export function EditSignalModal({ signal, onClose }: EditSignalModalProps) {
  const { toast } = useToast();

  // Derive initial category from tags (first tag that matches a category)
  const existingTags: string[] = Array.isArray(signal.tags) ? signal.tags : [];
  const initialCategory = existingTags.find(t => SIGNAL_CATEGORIES.includes(t)) ?? "";
  const initialTags = existingTags.filter(t => !SIGNAL_CATEGORIES.includes(t));

  const [title, setTitle] = useState(signal.title ?? "");
  const [description, setDescription] = useState(signal.description ?? "");
  const [category, setCategory] = useState(initialCategory);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [thumbDataUrl, setThumbDataUrl] = useState<string | null>(signal.thumbnailUrl ?? null);
  const [thumbBlob, setThumbBlob] = useState<Blob | null>(null);

  const libInputRef = useRef<HTMLInputElement>(null);
  const camInputRef = useRef<HTMLInputElement>(null);

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase();
    if (!t || tags.length >= 5 || tags.includes(t)) { setTagInput(""); return; }
    setTags((p) => [...p, t]);
    setTagInput("");
  };

  const handleThumbPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast({ title: "Please select an image file", variant: "destructive" });
      e.target.value = "";
      return;
    }
    const result = await cropImageTo916(file);
    if (result) {
      setThumbDataUrl(result.dataUrl);
      setThumbBlob(result.blob);
      toast({ title: "Thumbnail updated", description: "Auto-cropped to 9:16 portrait." });
    } else {
      toast({ title: "Couldn't load image", variant: "destructive" });
    }
    e.target.value = "";
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      // Merge category as first tag if selected
      const allTags = category ? [category, ...tags] : tags;
      fd.append("tags", JSON.stringify(allTags));
      if (thumbBlob) fd.append("thumbnail", thumbBlob, "thumbnail.jpg");

      const res = await fetch(`/api/mobile/signals/${signal.id}`, {
        method: "PATCH",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Save failed" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/signals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/signals", signal.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/signals/user", signal.authorId] });
      toast({ title: "Signal updated!" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't save changes", description: err.message, variant: "destructive" });
    },
  });

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-[#111] rounded-t-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-red-400" />
            <span className="text-white font-semibold text-sm">Edit Signal</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10">
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">

          {/* Title */}
          <div>
            <p className="text-white/50 text-xs mb-1.5">Title</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a title…"
              maxLength={200}
              className="w-full bg-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-white/30"
            />
          </div>

          {/* Description */}
          <div>
            <p className="text-white/50 text-xs mb-1.5">Description</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description…"
              maxLength={2000}
              rows={3}
              className="w-full bg-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-white/30 resize-none"
            />
          </div>

          {/* Category (optional) */}
          <div>
            <p className="text-white/50 text-xs mb-1.5">Category <span className="text-white/30">(optional)</span></p>
            <div className="grid grid-cols-2 gap-2">
              {SIGNAL_CATEGORIES.map((cat) => (
                <button key={cat}
                  onClick={() => setCategory((p) => p === cat ? "" : cat)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all text-left
                    ${category === cat ? "bg-red-500 text-white" : "bg-white/10 text-white/70"}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-white/50 text-xs mb-1.5">Tags <span className="text-white/30">({tags.length}/5)</span></p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <span key={tag}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white text-xs">
                    <span className="text-white/50">#</span>{tag}
                    <button onClick={() => setTags((p) => p.filter((t) => t !== tag))} className="ml-0.5">
                      <X className="w-3 h-3 text-white/50" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {tags.length < 5 && (
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                  placeholder="Add a tag…"
                  maxLength={32}
                  className="flex-1 bg-white/10 text-white rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-white/30"
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-white/70 text-sm font-medium disabled:opacity-40 active:bg-white/20"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Thumbnail */}
          <div>
            <p className="text-white/50 text-xs mb-1.5">Thumbnail</p>
            <div className="flex gap-3 items-start">
              <div className="shrink-0 rounded-lg overflow-hidden border border-white/20"
                style={{ width: 48, aspectRatio: "9/16" }}>
                {thumbDataUrl
                  ? <img src={thumbDataUrl} className="w-full h-full object-cover" alt="Thumbnail" />
                  : <div className="w-full h-full bg-white/10 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-white/30" />
                    </div>
                }
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <button type="button" onClick={() => libInputRef.current?.click()}
                  className="py-2 px-3 rounded-xl bg-white/10 text-white/70 text-sm text-left flex items-center gap-2 active:bg-white/20">
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span>Upload from Library</span>
                </button>
                <button type="button" onClick={() => camInputRef.current?.click()}
                  className="py-2 px-3 rounded-xl bg-white/10 text-white/70 text-sm text-left flex items-center gap-2 active:bg-white/20">
                  <Camera className="w-4 h-4 shrink-0" />
                  <span>Take Photo</span>
                </button>
              </div>
            </div>
            <p className="text-white/30 text-[10px] mt-1.5">Images are auto-cropped to 9:16 portrait.</p>
          </div>

          {/* Hidden inputs */}
          <input ref={libInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbPick} />
          <input ref={camInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleThumbPick} />

          {/* Save */}
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-50"
          >
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}
