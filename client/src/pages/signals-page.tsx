import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, fetchCsrfToken } from "@/lib/queryClient";
import type { SignalWithAuthor } from "@shared/schema";
import {
  Play, Heart, MessageCircle, Share2, X, Upload, Volume2, VolumeX,
  ChevronUp, ChevronDown, Loader2, Video, Send, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && nextSignal) onNavigate(nextSignal.id);
      if (e.key === "ArrowLeft" && prevSignal) onNavigate(prevSignal.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nextSignal, prevSignal, onClose, onNavigate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex bg-card rounded-2xl overflow-hidden shadow-2xl"
        style={{ width: "min(900px, 95vw)", height: "min(90vh, 700px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {prevSignal && (
          <button
            onClick={() => onNavigate(prevSignal.id)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
            title="Previous (←)"
          >
            <ChevronUp className="w-4 h-4 text-white" />
          </button>
        )}
        {nextSignal && (
          <button
            onClick={() => onNavigate(nextSignal.id)}
            className="absolute left-3 bottom-1/4 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
            title="Next (→)"
          >
            <ChevronDown className="w-4 h-4 text-white" />
          </button>
        )}

        <div className="relative bg-black flex-shrink-0" style={{ width: "340px" }}>
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
              <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              </div>
            </div>
          )}

          <button
            onClick={() => { const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted); } }}
            className="absolute bottom-14 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>

          <div
            className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 cursor-pointer"
            onClick={handleSeek}
          >
            <div className="h-full bg-white transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex-shrink-0">
                {signal.author?.avatar ? (
                  <img src={signal.author.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-bold">
                    {signal.author?.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">@{signal.author?.username}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(signal.createdAt as unknown as string)}</p>
              </div>
            </div>
            {signal.title && (
              <h2 className="font-bold text-base text-foreground mb-2">{signal.title}</h2>
            )}
            {signal.tags && signal.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {signal.tags.map((t) => (
                  <span key={t} className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-2 py-0.5 rounded-full">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={() => user && likeMutation.mutate()}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
              >
                <Heart className={`w-4 h-4 ${liked ? "fill-red-500" : ""}`} />
                {fmt(likeCount)}
              </button>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MessageCircle className="w-4 h-4" />
                {fmt(comments.length)}
              </div>
              <button
                onClick={() => navigator.share?.({ url: window.location.href + `?signal=${signal.id}`, title: signal.title ?? "Signal" }).catch(() => {})}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {commentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No comments yet. Be first!</p>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2.5 group">
                  <div className="w-7 h-7 rounded-full bg-muted overflow-hidden flex-shrink-0 mt-0.5">
                    {c.author.avatar ? (
                      <img src={c.author.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px] font-bold">
                        {c.author.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-foreground">{c.author.username}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-foreground/90 mt-0.5 break-words leading-relaxed">{c.content}</p>
                  </div>
                  {user?.id === c.authorId && (
                    <button
                      onClick={() => deleteMutation.mutate(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all w-6 h-6 flex items-center justify-center rounded flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {user ? (
            <form
              onSubmit={(e) => { e.preventDefault(); const t = commentText.trim(); if (t) commentMutation.mutate(t); }}
              className="p-3 border-t border-border flex gap-2 items-center"
            >
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                maxLength={2000}
                className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!commentText.trim() || commentMutation.isPending}
                className="rounded-full w-9 h-9 p-0"
              >
                {commentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          ) : (
            <div className="p-4 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">Log in to comment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadSignalModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const CATEGORIES = [
    "Politicians", "Corruption", "Current Events", "Legislation",
    "Voting & Elections", "Justice", "Economy", "Community",
  ];

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) handleFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const token = await fetchCsrfToken();
      const fd = new FormData();
      fd.append("video", file);
      fd.append("title", title);
      fd.append("category", category);
      const res = await fetch("/api/mobile/signals", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": token },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      await queryClient.invalidateQueries({ queryKey: ["/api/mobile/signals"] });
      toast({ title: "Signal uploaded!", description: "Your video is now live." });
      onClose();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Upload a Signal</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
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
            {preview ? (
              <div className="space-y-2">
                <video src={preview} className="max-h-32 mx-auto rounded-lg object-contain" muted />
                <p className="text-sm text-muted-foreground">{file?.name}</p>
                <p className="text-xs text-primary">Click to change</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Video className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                <p className="text-sm font-medium text-foreground">Drop a video here</p>
                <p className="text-xs text-muted-foreground">or click to browse · MP4, MOV, WebM</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your signal a title..."
              maxLength={200}
              className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c === category ? "" : c)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    category === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Post Signal</>
            )}
          </Button>
        </form>
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
