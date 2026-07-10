/**
 * SignalFeedItem — one full-screen snap slide in the TikTok-style feed.
 * Uses IntersectionObserver to autoplay when ≥70% visible, pause otherwise.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Heart, MessageCircle, Share2, Bookmark, Flag,
  Play, Volume2, VolumeX, LayoutGrid,
} from "lucide-react";
import { queryClient, fetchCsrfToken } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ShareSheet } from "@/components/share-sheet";
import { SignalCommentsOverlay } from "./SignalCommentsOverlay";
import type { SignalWithAuthor } from "@shared/schema";

interface SignalFeedItemProps {
  signal: SignalWithAuthor;
  /** Whether this item is currently snapped into view (drives play/pause) */
  isActive: boolean;
  /** Global mute state shared across items */
  muted: boolean;
  onMuteToggle: () => void;
  onGridClick: () => void;
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1e6).toFixed(1)}M`
  : n >= 1000     ? `${(n / 1000).toFixed(1)}K`
  : String(n);

export function SignalFeedItem({
  signal,
  isActive,
  muted,
  onMuteToggle,
  onGridClick,
}: SignalFeedItemProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [playing,        setPlaying]        = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [liked,          setLiked]          = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [likeCount,      setLikeCount]      = useState(signal.likesCount ?? 0);
  const [showComments,   setShowComments]   = useState(false);
  const [captionExpanded,setCaptionExpanded] = useState(false);
  const [flagged,        setFlagged]        = useState(false);
  const viewRecorded = useRef(false);

  // Sync mute state
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  // Autoplay / pause based on active state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.muted = muted;
      v.play().then(() => setPlaying(true)).catch(() => {});
      // Record view
      if (!viewRecorded.current) {
        viewRecorded.current = true;
        fetchCsrfToken()
          .then((token) =>
            fetch(`/api/mobile/signals/${signal.id}/view`, {
              method: "POST",
              credentials: "include",
              headers: { "x-csrf-token": token },
            })
          )
          .catch(() => {});
      }
    } else {
      v.pause();
      v.currentTime = 0;
      setPlaying(false);
      setProgress(0);
    }
  }, [isActive, muted, signal.id]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => {});
    else { v.pause(); setPlaying(false); }
  }, []);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (v && v.duration) setProgress(v.currentTime / v.duration);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const likeMutation = useMutation({
    mutationFn: async () => {
      const token = await fetchCsrfToken();
      const res = await fetch(`/api/mobile/signals/${signal.id}/like`, {
        method: liked ? "DELETE" : "POST",
        credentials: "include",
        headers: { "x-csrf-token": token },
      });
      if (!res.ok) throw new Error("Like failed");
      return res.json();
    },
    onMutate: () => {
      setLiked((p) => !p);
      setLikeCount((p) => (liked ? p - 1 : p + 1));
    },
    onError: () => {
      setLiked((p) => !p);
      setLikeCount((p) => (liked ? p + 1 : p - 1));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/signals"] }),
  });

  const flagMutation = useMutation({
    mutationFn: async () => {
      const token = await fetchCsrfToken();
      const res = await fetch("/api/flags", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: signal.id, targetType: "signal", reason: "inappropriate_content" }),
      });
      return res.json();
    },
    onSuccess: () => {
      setFlagged(true);
      toast({ title: "Reported", description: "A moderator will review this signal." });
    },
  });

  // ── Caption text ──────────────────────────────────────────────────────────
  const caption = signal.title ?? "";
  const description = (signal as any).description ?? "";
  const tags: string[] = signal.tags ?? [];
  const hasCaptionOverflow = description.length > 80 || tags.length > 3;

  // ── Author ────────────────────────────────────────────────────────────────
  const authorName = signal.author?.username ?? "anonymous";
  const authorAvatar = signal.author?.avatar;
  const authorInitial = authorName[0]?.toUpperCase() ?? "?";

  // Bottom offset: clear the bottom nav + safe area
  const bottomOffset = "calc(56px + env(safe-area-inset-bottom, 0px))";

  return (
    <div
      className="signal-feed-item"
      data-signal-id={signal.id}
    >
      {/* ── Video layer ─────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-black"
        onClick={togglePlay}
      >
        {signal.videoUrl ? (
          <video
            ref={videoRef}
            src={signal.videoUrl}
            className="w-full h-full object-cover"
            loop
            playsInline
            muted={muted}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onLoadedData={() => {
              if (isActive && videoRef.current) {
                videoRef.current.muted = muted;
                videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
              }
            }}
          />
        ) : (
          /* Thumbnail-only fallback */
          <div
            className="w-full h-full bg-gradient-to-br from-blue-900 via-navy to-red-900"
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {signal.thumbnailUrl && (
              <img
                src={signal.thumbnailUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </div>
        )}

        {/* Thumbnail overlay while paused */}
        {!playing && signal.thumbnailUrl && (
          <img
            src={signal.thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        )}
      </div>

      {/* ── Full-screen gradient overlays ───────────────────────────────────── */}
      {/* Top gradient */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "30%",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)",
        }}
      />
      {/* Bottom gradient */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: "55%",
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        }}
      />

      {/* ── Centre play icon ─────────────────────────────────────────────────── */}
      {!playing && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 5 }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          >
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 top-0 flex items-center gap-2 px-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 12px) + 10px)",
          zIndex: 10,
        }}
      >
        {/* ACP badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
        >
          <span
            className="text-[10px] font-bold tracking-wider"
            style={{ color: "#E6393A" }}
          >
            ACP
          </span>
          <span className="text-white/60 text-[10px]">Signals</span>
        </div>

        <div className="flex-1" />

        {/* Grid / Discover toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onGridClick(); }}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
          aria-label="Grid view"
        >
          <LayoutGrid className="w-4 h-4 text-white" />
        </button>

        {/* Mute toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted
            ? <VolumeX className="w-4.5 h-4.5 text-white" />
            : <Volume2 className="w-4.5 h-4.5 text-white" />
          }
        </button>
      </div>

      {/* ── Right-side action rail ────────────────────────────────────────────── */}
      <div
        className="absolute right-3 flex flex-col items-center gap-5"
        style={{
          bottom: `calc(${bottomOffset} + 16px)`,
          zIndex: 10,
        }}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!user) { toast({ title: "Log in to like" }); return; }
            likeMutation.mutate();
          }}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          aria-label="Like"
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{
              background: liked ? "rgba(230,57,58,0.75)" : "rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Heart
              className="w-6 h-6"
              style={{ color: liked ? "#fff" : "#fff" }}
              fill={liked ? "#fff" : "none"}
            />
          </div>
          <span className="text-white text-[11px] font-semibold drop-shadow-lg">
            {fmt(likeCount)}
          </span>
        </button>

        {/* Comment */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          aria-label="Comments"
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[11px] font-semibold drop-shadow-lg">
            {fmt(signal.commentsCount ?? 0)}
          </span>
        </button>

        {/* Share */}
        <ShareSheet
          title={signal.title ?? "Signal"}
          url={`${window.location.origin}/signals/${signal.id}`}
          trigger={(open) => (
            <button
              onClick={(e) => { e.stopPropagation(); open(); }}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
              aria-label="Share"
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
              >
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-[11px] font-semibold drop-shadow-lg">
                {fmt((signal as any).sharesCount ?? 0)}
              </span>
            </button>
          )}
        />

        {/* Save / Bookmark */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!user) { toast({ title: "Log in to save" }); return; }
            setSaved((p) => !p);
            toast({ title: saved ? "Removed from saved" : "Saved!" });
          }}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          aria-label={saved ? "Unsave" : "Save"}
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{
              background: saved ? "rgba(59,91,169,0.75)" : "rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Bookmark
              className="w-6 h-6 text-white"
              fill={saved ? "#fff" : "none"}
            />
          </div>
        </button>

        {/* Report */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!user) { toast({ title: "Log in to report" }); return; }
            if (flagged || flagMutation.isPending) return;
            flagMutation.mutate();
          }}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          aria-label="Report"
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{
              background: flagged ? "rgba(251,146,60,0.7)" : "rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Flag
              className="w-5 h-5"
              style={{ color: flagged ? "#fff" : "rgba(255,255,255,0.7)" }}
              fill={flagged ? "#fff" : "none"}
            />
          </div>
        </button>
      </div>

      {/* ── Bottom creator + caption area ──────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 flex flex-col"
        style={{
          bottom: `calc(${bottomOffset} + 8px)`,
          paddingLeft: 14,
          paddingRight: 72, // clear action rail
          zIndex: 10,
        }}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Creator row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/40">
            {authorAvatar ? (
              <img src={authorAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #E6393A, #3B5BA9)" }}
              >
                {authorInitial}
              </div>
            )}
          </div>
          <span className="text-white font-semibold text-sm drop-shadow-lg">
            @{authorName}
          </span>
        </div>

        {/* Title / caption */}
        {caption && (
          <p className="text-white font-bold text-[15px] leading-snug mb-1 drop-shadow-lg">
            {caption}
          </p>
        )}

        {/* Description / captions */}
        {description && (
          <p
            className="text-white/85 text-xs leading-relaxed mb-1.5 drop-shadow"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: captionExpanded ? 999 : 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </p>
        )}
        {description.length > 80 && (
          <button
            onClick={(e) => { e.stopPropagation(); setCaptionExpanded((p) => !p); }}
            className="text-white/60 text-xs mb-1.5 self-start"
          >
            {captionExpanded ? "less" : "more"}
          </button>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.slice(0, captionExpanded ? undefined : 3).map((tag) => (
              <span key={tag} className="text-white/75 text-xs drop-shadow">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div
          className="w-full h-[3px] rounded-full cursor-pointer mt-1"
          style={{ background: "rgba(255,255,255,0.25)" }}
          onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: "linear-gradient(to right, #E6393A, #fff)",
            }}
          />
        </div>
      </div>

      {/* Comments overlay */}
      {showComments && (
        <SignalCommentsOverlay
          signalId={signal.id}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}
