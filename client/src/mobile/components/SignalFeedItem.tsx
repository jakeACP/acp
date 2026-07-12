/**
 * SignalFeedItem — one full-screen snap slide in the TikTok-style feed.
 * Renders self-hosted MP4 uploads as <video>, YouTube/TikTok as <iframe> embeds,
 * and shows a clear error card when the video cannot play.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Heart, MessageCircle, Share2, Bookmark, Flag,
  Play, AlertTriangle, ExternalLink, Youtube,
} from "lucide-react";
import { queryClient, fetchCsrfToken } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useHaptics } from "../hooks/useHaptics";
import { ShareSheet } from "@/components/share-sheet";
import { SignalCommentsOverlay } from "./SignalCommentsOverlay";
import type { SignalWithAuthor } from "@shared/schema";
import { classifySignalUrl } from "@/mobile/lib/signal-video-utils";

interface SignalFeedItemProps {
  signal: SignalWithAuthor;
  isActive: boolean;
  muted: boolean;
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1e6).toFixed(1)}M`
  : n >= 1000     ? `${(n / 1000).toFixed(1)}K`
  : String(n);

export function SignalFeedItem({
  signal,
  isActive,
  muted,
}: SignalFeedItemProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { impact } = useHaptics();
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoInfo = classifySignalUrl(signal.videoUrl);

  const [playing,         setPlaying]         = useState(false);
  const [progress,        setProgress]        = useState(0);
  const [liked,           setLiked]           = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [likeCount,       setLikeCount]       = useState(signal.likesCount ?? 0);
  const [showComments,    setShowComments]    = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [flagged,         setFlagged]         = useState(false);
  const [videoError,      setVideoError]      = useState(false);
  const viewRecorded = useRef(false);

  // Sync mute state to <video>
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  // Autoplay / pause based on active state (only for self-hosted uploads)
  useEffect(() => {
    if (videoInfo.type !== 'upload') return;
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.muted = muted;
      v.play().then(() => setPlaying(true)).catch(() => {});
      if (!viewRecorded.current) {
        viewRecorded.current = true;
        fetchCsrfToken()
          .then((token) =>
            fetch(`/api/mobile/signals/${signal.id}/view`, {
              method: "POST", credentials: "include", headers: { "x-csrf-token": token },
            })
          )
          .catch(() => {});
      }
    } else {
      try {
        v.pause();
        if (Number.isFinite(v.duration)) v.currentTime = 0;
      } catch {
        // A slide can unmount while the media element is still loading.
      }
      setPlaying(false);
      setProgress(0);
    }
  }, [isActive, muted, signal.id, videoInfo.type]);

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/mobile/signals"] }),
  });

  const flagMutation = useMutation({
    mutationFn: async () => {
      const token = await fetchCsrfToken();
      const res = await fetch("/api/flags", {
        method: "POST", credentials: "include",
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

  const caption      = signal.title ?? "";
  const description  = (signal as any).description ?? "";
  const tags: string[] = signal.tags ?? [];
  const authorName   = signal.author?.username ?? "anonymous";
  const authorAvatar = signal.author?.avatar;
  const authorInitial = authorName[0]?.toUpperCase() ?? "?";
  const bottomOffset  = "calc(56px + env(safe-area-inset-bottom, 0px))";

  // ── Video layer ────────────────────────────────────────────────────────────
  const renderVideoLayer = () => {
    // Error fallback
    if (videoError) {
      return (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-3 px-6">
          <AlertTriangle className="w-10 h-10 text-yellow-400" />
          <p className="text-white/80 text-sm font-medium text-center">
            This video could not be played.
          </p>
          {signal.videoUrl && (
            <a
              href={signal.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-400 text-sm underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" />
              Open original link
            </a>
          )}
        </div>
      );
    }

    // YouTube embed
    if (videoInfo.type === 'youtube' && videoInfo.embedUrl) {
      return (
        <div className="absolute inset-0 bg-black">
          {!isActive ? (
            // While not in view: show YouTube thumbnail + play overlay
            <div className="absolute inset-0">
              {videoInfo.youtubeThumbnailUrl && (
                <img
                  src={videoInfo.youtubeThumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => {/* thumbnail 404 is fine */}}
                />
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                  <Youtube className="w-9 h-9 text-white" />
                </div>
              </div>
            </div>
          ) : (
            // When active: render the YouTube iframe embed
            <iframe
              src={videoInfo.embedUrl}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              title={signal.title ?? "Signal"}
            />
          )}
        </div>
      );
    }

    // TikTok embed
    if (videoInfo.type === 'tiktok') {
      const thumbnail = signal.thumbnailUrl;
      return (
        <div className="absolute inset-0 bg-black">
          {!isActive || !videoInfo.embedUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              {thumbnail ? (
                <img src={thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#010101] to-[#1a1a1a]" />
              )}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-black/70 flex items-center justify-center">
                  <span className="text-white text-3xl">🎵</span>
                </div>
                <span className="text-white/70 text-sm">TikTok Video</span>
                {signal.videoUrl && (
                  <a
                    href={signal.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-white/80 text-xs underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in TikTok
                  </a>
                )}
              </div>
            </div>
          ) : (
            <iframe
              src={videoInfo.embedUrl}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={signal.title ?? "Signal"}
            />
          )}
        </div>
      );
    }

    // Self-hosted upload (or unknown URL — attempt to play)
    const thumbnail = signal.thumbnailUrl;
    return (
      <div className="absolute inset-0 bg-black" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={signal.videoUrl ?? undefined}
          poster={thumbnail || undefined}
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
              videoRef.current.play().then(() => setPlaying(true)).catch(() => {
                setPlaying(false);
              });
            }
          }}
          onError={() => {
            setPlaying(false);
            setVideoError(true);
          }}
        />
        {/* Thumbnail overlay while paused */}
        {!playing && thumbnail && !videoError && (
          <img
            src={thumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        )}
        {!playing && !thumbnail && !videoError && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "linear-gradient(145deg, rgba(230,57,58,0.72), rgba(7,26,58,0.94) 58%, rgba(59,91,169,0.8))" }}
            aria-hidden="true"
          />
        )}
      </div>
    );
  };

  const isNativeVideo = videoInfo.type === 'upload' || videoInfo.type === 'unknown';

  return (
    <div className="signal-feed-item" data-signal-id={signal.id}>
      {renderVideoLayer()}

      {/* Gradient overlays */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{ height: "30%", background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: "55%", background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }}
      />

      {/* Centre play icon — only for native video, not iframes */}
      {isNativeVideo && !playing && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Right-side action rail */}
      <div
        className="absolute right-3 flex flex-col items-center gap-5"
        style={{ bottom: `calc(${bottomOffset} + 16px)`, zIndex: 10 }}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!user) { toast({ title: "Log in to like" }); return; }
            impact('light');
            likeMutation.mutate();
          }}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          aria-label="Like"
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: liked ? "rgba(230,57,58,0.75)" : "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
          >
            <Heart className="w-6 h-6" style={{ color: "#fff" }} fill={liked ? "#fff" : "none"} />
          </div>
          <span className="text-white text-[11px] font-semibold drop-shadow-lg">{fmt(likeCount)}</span>
        </button>

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
          <span className="text-white text-[11px] font-semibold drop-shadow-lg">{fmt(signal.commentsCount ?? 0)}</span>
        </button>

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
              <span className="text-white text-[11px] font-semibold drop-shadow-lg">{fmt((signal as any).sharesCount ?? 0)}</span>
            </button>
          )}
        />

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
            style={{ background: saved ? "rgba(59,91,169,0.75)" : "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
          >
            <Bookmark className="w-6 h-6 text-white" fill={saved ? "#fff" : "none"} />
          </div>
        </button>

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
            style={{ background: flagged ? "rgba(251,146,60,0.7)" : "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
          >
            <Flag className="w-5 h-5" style={{ color: flagged ? "#fff" : "rgba(255,255,255,0.7)" }} fill={flagged ? "#fff" : "none"} />
          </div>
        </button>
      </div>

      {/* Bottom creator + caption */}
      <div
        className="absolute inset-x-0 flex flex-col"
        style={{ bottom: `calc(${bottomOffset} + 8px)`, paddingLeft: 14, paddingRight: 72, zIndex: 10 }}
        onTouchStart={(e) => e.stopPropagation()}
      >
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
          <span className="text-white font-semibold text-sm drop-shadow-lg">@{authorName}</span>
        </div>

        {caption && (
          <p className="text-white font-bold text-[15px] leading-snug mb-1 drop-shadow-lg">{caption}</p>
        )}

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

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.slice(0, captionExpanded ? undefined : 3).map((tag) => (
              <span key={tag} className="text-white/75 text-xs drop-shadow">#{tag}</span>
            ))}
          </div>
        )}

        {/* Progress bar — only for native video */}
        {isNativeVideo && !videoError && (
          <div
            className="w-full h-[3px] rounded-full cursor-pointer mt-1"
            style={{ background: "rgba(255,255,255,0.25)" }}
            onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${progress * 100}%`, background: "linear-gradient(to right, #E6393A, #fff)" }}
            />
          </div>
        )}
      </div>

      {showComments && (
        <SignalCommentsOverlay signalId={signal.id} onClose={() => setShowComments(false)} />
      )}
    </div>
  );
}
