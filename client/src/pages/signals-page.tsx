import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, fetchCsrfToken } from "@/lib/queryClient";
import type { SignalWithAuthor } from "@shared/schema";
import {
  Play, Heart, MessageCircle, Share2, X, Upload, Volume2, VolumeX,
  ChevronUp, ChevronDown, Loader2, Video, Send, Trash2, Pencil, AlertTriangle, Check, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { setPendingSignalFile } from "@/lib/signalFileStore";

interface CommentWithAuthor {
  id: string;
  signalId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: { id: string; username: string; avatar: string | null };
}

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmt(n: number) {
  return n >= 1_000_000 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n ?? 0);
}

function SignalGridCard({
  signal,
  onClick,
}: {
  signal: SignalWithAuthor;
  onClick: () => void;
}) {
  const [resolved, setResolved] = useState(signal.duration);

  useEffect(() => {
    if (signal.duration > 0 || !signal.videoUrl) return;
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = signal.videoUrl;
    v.onloadedmetadata = () => {
      if (isFinite(v.duration) && v.duration > 0) setResolved(Math.round(v.duration));
      v.src = "";
    };
    return () => { v.onloadedmetadata = null; v.src = ""; };
  }, [signal.duration, signal.videoUrl]);

  const dur = formatDuration(resolved);

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer group bg-black aspect-[9/16]"
      onClick={onClick}
    >
      {signal.thumbnailUrl ? (
        <img
          src={signal.thumbnailUrl}
          alt={signal.title || "Signal"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-900 via-slate-800 to-red-900" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
          <Play className="w-7 h-7 text-white ml-1" fill="white" />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">
          {signal.title || "Untitled Signal"}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-white/60 text-[10px]">@{signal.author?.username}</span>
          <div className="flex items-center gap-2 text-white/60 text-[10px]">
            {dur && <span>{dur}</span>}
            <span className="flex items-center gap-0.5">
              <Heart className="w-2.5 h-2.5" /> {fmt(signal.likesCount ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {signal.tags && signal.tags.length > 0 && (
        <div className="absolute top-2 left-2">
          <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
            {signal.tags[0]}
          </span>
        </div>
      )}
    </div>
  );
}

function SignalPlayerModal({
  signal,
  allSignals,
  onClose,
  onNavigate,
}: {
  signal: SignalWithAuthor;
  allSignals: SignalWithAuthor[];
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(signal.likesCount ?? 0);
  const [commentText, setCommentText] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editTitle, setEditTitle] = useState(signal.title ?? "");
  const [editDescription, setEditDescription] = useState(signal.description ?? "");
  const [editTagInput, setEditTagInput] = useState((signal.tags ?? []).join(" "));
  const [editThumbFile, setEditThumbFile] = useState<File | null>(null);
  const [editThumbPreview, setEditThumbPreview] = useState<string | null>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isOwner = user?.id === signal.authorId;

  const idx = allSignals.findIndex((s) => s.id === signal.id);
  const prevSignal = idx > 0 ? allSignals[idx - 1] : null;
  const nextSignal = idx < allSignals.length - 1 ? allSignals[idx + 1] : null;

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setLikeCount(signal.likesCount ?? 0);
  }, [signal.id]);

  const handleLoaded = useCallback(() => {
    videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => {});
    else { v.pause(); setPlaying(false); }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
  };

  const { data: comments = [], isLoading: commentsLoading } = useQuery<CommentWithAuthor[]>({
    queryKey: ["/api/mobile/signals", signal.id, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/mobile/signals/${signal.id}/comments`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const token = await fetchCsrfToken();
      await fetch(`/api/mobile/signals/${signal.id}/like`, {
        method: liked ? "DELETE" : "POST",
        credentials: "include",
        headers: { "x-csrf-token": token },
      });
    },
    onMutate: () => {
      setLiked((p) => !p);
      setLikeCount((p) => liked ? p - 1 : p + 1);
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const token = await fetchCsrfToken();
      const res = await fetch(`/api/mobile/signals/${signal.id}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-csrf-token": token },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/signals", signal.id, "comments"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const token = await fetchCsrfToken();
      await fetch(`/api/mobile/signals/${signal.id}/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "x-csrf-token": token },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/signals", signal.id, "comments"] });
    },
  });

  const editSignalMutation = useMutation({
    mutationFn: async ({ title, description, tags }: { title: string; description: string; tags: string[] }) => {
      const token = await fetchCsrfToken();
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("tags", JSON.stringify(tags));
      if (editThumbFile) fd.append("thumbnail", editThumbFile);
      const res = await fetch(`/api/mobile/signals/${signal.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "x-csrf-token": token },
        body: fd,
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/signals"] });
      setEditMode(false);
      setEditThumbFile(null);
      setEditThumbPreview(null);
      toast({ title: "Signal updated!" });
    },
    onError: (err: any) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const deleteSignalMutation = useMutation({
    mutationFn: async () => {
      const token = await fetchCsrfToken();
      const res = await fetch(`/api/mobile/signals/${signal.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "x-csrf-token": token },
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/signals"] });
      toast({ title: "Signal deleted" });
      onClose();
    },
    onError: (err: any) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && nextSignal) onNavigate(nextSignal.id);
      if (e.key === "ArrowLeft" && prevSignal) onNavigate(prevSignal.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nextSignal, prevSignal, onClose, onNavigate]);

  const glassPanel: React.CSSProperties = {
    background: "linear-gradient(135deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.05) 100%)",
    backdropFilter: "blur(40px) saturate(180%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 8px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="relative flex rounded-3xl overflow-hidden"
        style={{ ...glassPanel, width: "min(920px, 95vw)", height: "min(90vh, 700px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Prev / Next */}
        {prevSignal && (
          <button
            onClick={() => onNavigate(prevSignal.id)}
            className="absolute left-[322px] top-1/2 -translate-y-8 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}
            title="Previous (←)"
          >
            <ChevronUp className="w-4 h-4 text-white" />
          </button>
        )}
        {nextSignal && (
          <button
            onClick={() => onNavigate(nextSignal.id)}
            className="absolute left-[322px] top-1/2 translate-y-1 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}
            title="Next (→)"
          >
            <ChevronDown className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Video panel */}
        <div className="relative bg-black flex-shrink-0 overflow-hidden" style={{ width: "340px" }}>
          <video
            key={signal.id}
            ref={videoRef}
            src={signal.videoUrl}
            className="w-full h-full object-cover cursor-pointer"
            loop
            playsInline
            muted={muted}
            onLoadedData={handleLoaded}
            onTimeUpdate={() => {
              const v = videoRef.current;
              if (v && v.duration) setProgress(v.currentTime / v.duration);
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onClick={togglePlay}
          />

          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.3)" }}>
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              </div>
            </div>
          )}

          <button
            onClick={() => { const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted); } }}
            className="absolute bottom-14 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>

          <div className="absolute bottom-0 left-0 right-0 h-1 cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }} onClick={handleSeek}>
            <div className="h-full bg-white/90 transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        {/* Info + Comments panel */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <div className="p-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                {signal.author?.avatar ? (
                  <img src={signal.author.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/70 text-sm font-bold">
                    {signal.author?.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm text-white drop-shadow">@{signal.author?.username}</p>
                <p className="text-xs text-white/50">{timeAgo(signal.createdAt as unknown as string)}</p>
              </div>
            </div>

            {/* Owner actions */}
            {isOwner && !editMode && !deleteConfirm && (
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => { setEditTitle(signal.title ?? ""); setEditTagInput((signal.tags ?? []).join(" ")); setEditMode(true); }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105"
                  style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105"
                  style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.35)", color: "rgba(252,165,165,0.9)" }}
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}

            {/* Delete confirmation */}
            {deleteConfirm && (
              <div className="mb-3 p-3 rounded-xl"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-white/90 font-medium">Delete this signal?</p>
                </div>
                <p className="text-xs text-white/50 mb-3">This can't be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteSignalMutation.mutate()}
                    disabled={deleteSignalMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg transition-all"
                    style={{ background: "rgba(239,68,68,0.6)", border: "1px solid rgba(239,68,68,0.5)", color: "white" }}
                  >
                    {deleteSignalMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="flex-1 text-xs py-1.5 rounded-lg text-white/60 transition-all"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Edit form */}
            {editMode ? (
              <div className="space-y-2 mb-3">
                {/* Thumbnail picker */}
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setEditThumbFile(f);
                    setEditThumbPreview(URL.createObjectURL(f));
                  }}
                />
                <button
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  className="w-full rounded-lg overflow-hidden relative group transition-all"
                  style={{ height: "80px", background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.25)" }}
                >
                  {editThumbPreview || signal.thumbnailUrl ? (
                    <img
                      src={editThumbPreview ?? signal.thumbnailUrl!}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <Upload className="w-5 h-5 text-white/30" />
                      <span className="text-[10px] text-white/30">Click to add thumbnail</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,0,0,0.5)" }}>
                    <span className="text-xs text-white flex items-center gap-1.5">
                      <Pencil className="w-3 h-3" /> Change thumbnail
                    </span>
                  </div>
                </button>

                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title..."
                  maxLength={200}
                  className="w-full rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.2)" }}
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description..."
                  maxLength={2000}
                  rows={3}
                  className="w-full rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none transition-all resize-none"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.2)" }}
                />
                <input
                  type="text"
                  value={editTagInput}
                  onChange={(e) => setEditTagInput(e.target.value)}
                  placeholder="Tags (space or comma separated)"
                  className="w-full rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.2)" }}
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      const tags = editTagInput.split(/[\s,]+/).map((t) => t.replace(/^#/, "").trim()).filter(Boolean);
                      editSignalMutation.mutate({ title: editTitle, description: editDescription, tags });
                    }}
                    disabled={editSignalMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg transition-all"
                    style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", color: "white" }}
                  >
                    {editSignalMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save
                  </button>
                  <button
                    onClick={() => { setEditMode(false); setEditThumbFile(null); setEditThumbPreview(null); }}
                    className="flex-1 text-xs py-1.5 rounded-lg text-white/50 transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {signal.title && (
                  <h2 className="font-bold text-base text-white drop-shadow mb-1">{signal.title}</h2>
                )}
                {signal.description && (
                  <p className="text-sm text-white/65 leading-relaxed mb-2 line-clamp-3">{signal.description}</p>
                )}
                {signal.tags && signal.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {signal.tags.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full text-white/80"
                        style={{ background: "rgba(239,68,68,0.3)", border: "1px solid rgba(239,68,68,0.4)" }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                ) : isOwner ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-xs text-white/25 hover:text-white/50 transition-colors mb-2 italic"
                  >
                    + Add tags
                  </button>
                ) : null}
              </>
            )}

            <div className="flex items-center gap-5">
              <button
                onClick={() => user && likeMutation.mutate()}
                className={`flex items-center gap-1.5 text-sm font-medium transition-all ${liked ? "text-red-400" : "text-white/60 hover:text-red-400"}`}
              >
                <Heart className={`w-4 h-4 ${liked ? "fill-red-400" : ""}`} />
                {fmt(likeCount)}
              </button>
              <div className="flex items-center gap-1.5 text-sm text-white/50">
                <MessageCircle className="w-4 h-4" />
                {fmt(comments.length)}
              </div>
              <button
                onClick={() => navigator.share?.({ url: window.location.href + `?signal=${signal.id}`, title: signal.title ?? "Signal" }).catch(() => {})}
                className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/90 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = signal.videoUrl;
                  a.download = (signal.title ?? "signal").replace(/[^a-z0-9]/gi, "_") + ".mp4";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}>
            {commentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-white/40" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-sm text-white/40">No comments yet. Be first!</p>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2.5 group">
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}>
                    {c.author.avatar ? (
                      <img src={c.author.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/60 text-[10px] font-bold">
                        {c.author.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-white/90">{c.author.username}</span>
                      <span className="text-[10px] text-white/35">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-white/80 mt-0.5 break-words leading-relaxed">{c.content}</p>
                  </div>
                  {user?.id === c.authorId && (
                    <button
                      onClick={() => deleteMutation.mutate(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all w-6 h-6 flex items-center justify-center rounded flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          {user ? (
            <form
              onSubmit={(e) => { e.preventDefault(); const t = commentText.trim(); if (t) commentMutation.mutate(t); }}
              className="p-3 flex gap-2 items-center"
              style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
            >
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                maxLength={2000}
                className="flex-1 rounded-full px-4 py-2 text-sm text-white placeholder-white/30 outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
                onFocus={(e) => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.35)")}
                onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.15)")}
              />
              <button
                type="submit"
                disabled={!commentText.trim() || commentMutation.isPending}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:scale-105"
                style={{
                  background: commentText.trim() ? "rgba(239,68,68,0.75)" : "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {commentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </form>
          ) : (
            <div className="p-4 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
              <p className="text-sm text-white/40">Log in to comment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadSignalModal({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const { toast } = useToast();

  const handleFile = (f: File) => {
    if (!f.type.startsWith("video/")) {
      toast({ title: "Invalid file", description: "Please select a video file (MP4, MOV, WebM).", variant: "destructive" });
      return;
    }
    setPendingSignalFile(f);
    onClose();
    setLocation("/signals/edit");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) handleFile(f);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Upload a Signal</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div
            className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <Video className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Drop a video here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM — opens in timeline editor</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignalsPage() {
  const { user } = useAuth();
  const [activeSignalId, setActiveSignalId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const { data: signals = [], isLoading } = useQuery<SignalWithAuthor[]>({
    queryKey: ["/api/mobile/signals"],
    queryFn: async () => {
      const res = await fetch("/api/mobile/signals?limit=100", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const activeSignal = signals.find((s) => s.id === activeSignalId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Signals</h1>
            <p className="text-muted-foreground text-sm mt-1">Short-form political video</p>
          </div>
          {user && (
            <Button onClick={() => setShowUpload(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Signal
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-24">
            <Video className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No signals yet</h2>
            <p className="text-muted-foreground mb-6">Be the first to share a signal.</p>
            {user && (
              <Button onClick={() => setShowUpload(true)} className="gap-2">
                <Upload className="w-4 h-4" /> Upload the first Signal
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {signals.map((signal) => (
              <SignalGridCard
                key={signal.id}
                signal={signal}
                onClick={() => setActiveSignalId(signal.id)}
              />
            ))}
          </div>
        )}
      </div>

      {activeSignal && (
        <SignalPlayerModal
          signal={activeSignal}
          allSignals={signals}
          onClose={() => setActiveSignalId(null)}
          onNavigate={(id) => setActiveSignalId(id)}
        />
      )}

      {showUpload && <UploadSignalModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}
