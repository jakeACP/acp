import { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, Heart, MessageCircle, Share2, Play, Volume2, VolumeX, MoreVertical,
  AlertTriangle, ExternalLink, Youtube,
} from "lucide-react";
import { queryClient, fetchCsrfToken } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { SignalWithAuthor } from "@shared/schema";
import { SignalCommentsOverlay } from "../components/SignalCommentsOverlay";
import { ShareSheet } from "@/components/share-sheet";
import { ContentActionSheet } from "../components/ContentActionSheet";
import { classifySignalUrl } from "@/mobile/lib/signal-video-utils";

const SWIPE_THRESHOLD = 72;
const SWIPE_EXIT_PX   = 340;

export function SignalPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const videoRef     = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playing,        setPlaying]        = useState(false);
  const [muted,          setMuted]          = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [liked,          setLiked]          = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(0);
  const [showComments,   setShowComments]   = useState(false);
  const [showActions,    setShowActions]    = useState(false);
  const [videoError,     setVideoError]     = useState(false);

  const touchStartY  = useRef<number | null>(null);
  const touchStartX  = useRef<number | null>(null);
  const [dragY,      setDragY]      = useState(0);
  const [exiting,    setExiting]    = useState<"up" | "down" | null>(null);
  const dragging     = useRef(false);
  const isTap        = useRef(true);
  const viewRecorded = useRef(false);

  const { data: signal, isLoading } = useQuery<SignalWithAuthor>({
    queryKey: ["/api/mobile/signals", id],
    queryFn: async () => {
      const res = await fetch(`/api/mobile/signals/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Signal not found");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: allSignals } = useQuery<SignalWithAuthor[]>({
    queryKey: ["/api/mobile/signals"],
    queryFn: async () => {
      const res = await fetch("/api/mobile/signals?limit=100", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load signals");
      return res.json();
    },
  });

  const currentIndex = allSignals?.findIndex((s) => s.id === id) ?? -1;
  const prevSignal   = currentIndex > 0 ? allSignals![currentIndex - 1] : null;
  const nextSignal   = currentIndex >= 0 && currentIndex < (allSignals?.length ?? 0) - 1
    ? allSignals![currentIndex + 1] : null;

  useEffect(() => {
    if (signal) setLocalLikeCount(signal.likesCount ?? 0);
  }, [signal]);

  useEffect(() => {
    if (!id || viewRecorded.current) return;
    viewRecorded.current = true;
    fetchCsrfToken().then((token) =>
      fetch(`/api/mobile/signals/${id}/view`, {
        method: "POST", credentials: "include", headers: { "x-csrf-token": token },
      })
    ).catch(() => {});
  }, [id]);

  const handleVideoLoaded = useCallback(() => {
    videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => {});
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

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

  const likeMutation = useMutation({
    mutationFn: async () => {
      const token = await fetchCsrfToken();
      const res = await fetch(`/api/mobile/signals/${id}/like`, {
        method: liked ? "DELETE" : "POST",
        credentials: "include",
        headers: { "x-csrf-token": token },
      });
      if (!res.ok) throw new Error("Like failed");
      return res.json();
    },
    onMutate: () => {
      setLiked((p) => !p);
      setLocalLikeCount((p) => liked ? p - 1 : p + 1);
    },
    onError: () => {
      setLiked((p) => !p);
      setLocalLikeCount((p) => liked ? p + 1 : p - 1);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/mobile/signals"] }),
  });

  const commitNavigation = useCallback((direction: "up" | "down") => {
    videoRef.current?.pause();
    setExiting(direction);
    setTimeout(() => {
      if (direction === "up") {
        if (nextSignal) navigate(`/mobile/signals/${nextSignal.id}`);
        else navigate("/mobile/signals");
      } else {
        if (prevSignal) navigate(`/mobile/signals/${prevSignal.id}`);
        else navigate("/mobile/signals");
      }
    }, 220);
  }, [nextSignal, prevSignal, navigate]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    dragging.current    = true;
    isTap.current       = true;
    setDragY(0);
    setExiting(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || touchStartY.current === null || touchStartX.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dy) < 10) return;
    if (Math.abs(dy) > 8) isTap.current = false;
    const damped = dy * (1 - Math.min(Math.abs(dy) / 600, 0.6));
    setDragY(damped);
  };

  const handleTouchEnd = () => {
    dragging.current = false;
    if (isTap.current) {
      togglePlay();
      setDragY(0);
      return;
    }
    if (dragY < -SWIPE_THRESHOLD) commitNavigation("up");
    else if (dragY > SWIPE_THRESHOLD) commitNavigation("down");
    else setDragY(0);
  };

  const containerTranslateY = exiting === "up" ? -SWIPE_EXIT_PX
    : exiting === "down" ? SWIPE_EXIT_PX : dragY;

  const containerStyle: React.CSSProperties = {
    transform: `translateY(${containerTranslateY}px)`,
    transition: exiting || dragY === 0 ? "transform 0.22s cubic-bezier(0.4,0,0.2,1)" : "none",
    zIndex: 50,
  };

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1e6).toFixed(1)}M`
    : n >= 1000 ? `${(n / 1000).toFixed(1)}K`
    : String(n);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white">Signal not found.</p>
        <button onClick={() => navigate("/mobile/signals")} className="text-white/60 text-sm underline">
          Back to Signals
        </button>
      </div>
    );
  }

  const videoInfo  = classifySignalUrl(signal.videoUrl);
  const isNativeVideo = videoInfo.type === 'upload' || videoInfo.type === 'unknown';

  // ── Video / embed layer ────────────────────────────────────────────────────
  const renderVideoLayer = () => {
    if (videoError) {
      return (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-4 px-8">
          <AlertTriangle className="w-12 h-12 text-yellow-400" />
          <p className="text-white text-center font-medium">This video could not be played.</p>
          {signal.videoUrl && (
            <a
              href={signal.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-400 underline"
            >
              <ExternalLink className="w-4 h-4" />
              Open original link
            </a>
          )}
          <button onClick={() => navigate("/mobile/signals")} className="text-white/50 text-sm mt-2">
            ← Back to Signals
          </button>
        </div>
      );
    }

    if (videoInfo.type === 'youtube' && videoInfo.embedUrl) {
      return (
        <div className="absolute inset-0 bg-black" onClick={undefined}>
          <iframe
            src={videoInfo.embedUrl}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            title={signal.title ?? "Signal"}
          />
        </div>
      );
    }

    if (videoInfo.type === 'tiktok') {
      return (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 px-8">
          {signal.thumbnailUrl && (
            <img src={signal.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          )}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-black/70 flex items-center justify-center">
              <span className="text-5xl">🎵</span>
            </div>
            <p className="text-white font-semibold text-lg text-center">{signal.title || "TikTok Video"}</p>
            {signal.videoUrl && (
              <a
                href={signal.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-5 py-2.5 rounded-full font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open in TikTok
              </a>
            )}
          </div>
        </div>
      );
    }

    // Native video (upload or unknown)
    return (
      <div className="absolute inset-0" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={signal.videoUrl ?? undefined}
          className="w-full h-full object-cover"
          loop
          playsInline
          muted={muted}
          onLoadedData={handleVideoLoaded}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setVideoError(true)}
        />
        {!playing && signal.thumbnailUrl && (
          <img
            src={signal.thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black flex flex-col select-none overflow-hidden"
      style={containerStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {renderVideoLayer()}

      {/* Centre play indicator — only for native video */}
      {isNativeVideo && !playing && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Swipe hint arrows */}
      {Math.abs(dragY) > 20 && (
        <div className="absolute inset-0 flex flex-col items-center justify-between py-16 pointer-events-none" style={{ zIndex: 20 }}>
          {nextSignal && dragY < 0 && (
            <div className="mt-auto mb-8 flex flex-col items-center gap-1 opacity-80">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-white text-lg">↑</span>
              </div>
              <span className="text-white/80 text-xs font-medium">Next signal</span>
            </div>
          )}
          {dragY > 0 && (
            <div className="mt-8 flex flex-col items-center gap-1 opacity-80">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-white text-lg">↓</span>
              </div>
              <span className="text-white/80 text-xs font-medium">{prevSignal ? "Previous" : "Back to feed"}</span>
            </div>
          )}
        </div>
      )}

      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center gap-3 p-4"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)", zIndex: 10 }}
      >
        <button
          onClick={() => navigate("/mobile/signals")}
          onTouchEnd={(e) => { e.stopPropagation(); navigate("/mobile/signals"); }}
          className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm active:bg-black/60 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <span className="type-tag signal text-xs">Signal</span>
        </div>
        {/* YouTube badge */}
        {videoInfo.type === 'youtube' && (
          <div className="flex items-center gap-1.5 bg-red-600/80 backdrop-blur-sm rounded-full px-2.5 py-1">
            <Youtube className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-[10px] font-semibold">YouTube</span>
          </div>
        )}
        {/* TikTok badge */}
        {videoInfo.type === 'tiktok' && (
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-white text-[10px] font-semibold">🎵 TikTok</span>
          </div>
        )}
        {/* Mute — native video only */}
        {isNativeVideo && !videoError && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
            onTouchEnd={(e) => { e.stopPropagation(); toggleMute(); }}
            className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm active:bg-black/60 transition-colors"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setShowActions(true); }}
          onTouchEnd={(e) => { e.stopPropagation(); setShowActions(true); }}
          className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm active:bg-black/60 transition-colors"
          aria-label="More options"
          data-testid="signal-more-options"
        >
          <MoreVertical className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Right-side action buttons */}
      <div
        className="absolute right-3 bottom-32 flex flex-col items-center gap-5"
        style={{ zIndex: 10 }}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => { e.stopPropagation(); user && likeMutation.mutate(); }}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          aria-label="Like"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm ${liked ? "bg-red-500/80" : "bg-black/40"}`}>
            <Heart className={`w-6 h-6 ${liked ? "text-white fill-white" : "text-white"}`} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{fmt(localLikeCount)}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          aria-label="Comments"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{fmt(signal.commentsCount ?? 0)}</span>
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
              <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs font-semibold drop-shadow">{fmt(signal.sharesCount ?? 0)}</span>
            </button>
          )}
        />
      </div>

      {/* Bottom info */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-6 pr-20"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)", zIndex: 10 }}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex-shrink-0">
            {signal.author?.avatar ? (
              <img src={signal.author.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                {(signal.author?.username ?? "?")[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-white font-semibold text-sm drop-shadow">
            {signal.author?.username ?? "Anonymous"}
          </span>
        </div>

        {signal.title && (
          <p className="text-white font-bold text-base mb-1 line-clamp-2 drop-shadow">{signal.title}</p>
        )}

        {signal.tags && signal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {signal.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-white/80 text-xs">#{tag}</span>
            ))}
          </div>
        )}

        {/* Progress bar — native video only */}
        {isNativeVideo && !videoError && (
          <div
            className="w-full h-1 bg-white/30 rounded-full cursor-pointer mt-1"
            onClick={handleSeek}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="h-full bg-white rounded-full" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>

      {showComments && (
        <SignalCommentsOverlay signalId={signal.id} onClose={() => setShowComments(false)} />
      )}

      {showActions && (
        <ContentActionSheet
          contentType="signal"
          contentId={signal.id}
          authorId={signal.authorId}
          authorUsername={signal.author?.username}
          shareUrl={`${window.location.origin}/mobile/signals/${signal.id}`}
          onClose={() => setShowActions(false)}
          onHide={() => navigate("/mobile/signals")}
        />
      )}
    </div>
  );
}
