import { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Heart, MessageCircle, Share2, Play, Volume2, VolumeX } from "lucide-react";
import { queryClient, fetchCsrfToken } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { SignalWithAuthor } from "@shared/schema";

export function SignalPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(0);
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

  useEffect(() => {
    if (signal) setLocalLikeCount(signal.likesCount ?? 0);
  }, [signal]);

  // Auto-play when video loads
  const handleVideoLoaded = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().then(() => setPlaying(true)).catch(() => {});
  }, []);

  // Record view once
  useEffect(() => {
    if (!id || viewRecorded.current) return;
    viewRecorded.current = true;
    fetch(`/api/mobile/signals/${id}/view`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, [id]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
  };

  const likeMutation = useMutation({
    mutationFn: async () => {
      const token = await fetchCsrfToken();
      const method = liked ? "DELETE" : "POST";
      const res = await fetch(`/api/mobile/signals/${id}/like`, {
        method,
        credentials: "include",
        headers: { "x-csrf-token": token },
      });
      if (!res.ok) throw new Error("Like failed");
      return res.json();
    },
    onMutate: () => {
      setLiked((prev) => !prev);
      setLocalLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    },
    onError: () => {
      setLiked((prev) => !prev);
      setLocalLikeCount((prev) => (liked ? prev + 1 : prev - 1));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/signals"] });
    },
  });

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

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

  return (
    <div className="fixed inset-0 bg-black flex flex-col select-none" style={{ zIndex: 50 }}>
      {/* Video layer */}
      <div className="absolute inset-0" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={signal.videoUrl}
          className="w-full h-full object-contain"
          loop
          playsInline
          muted={muted}
          onLoadedData={handleVideoLoaded}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        {/* Thumbnail shown before play */}
        {!playing && signal.thumbnailUrl && (
          <img
            src={signal.thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}
      </div>

      {/* Play/pause centre indicator — flashes briefly on tap */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-3 p-4 pt-safe-top"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)", zIndex: 10 }}>
        <button
          onClick={() => navigate("/mobile/signals")}
          className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm active:bg-black/60 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <span className="type-tag signal text-xs">Signal</span>
        </div>
        <button
          onClick={toggleMute}
          className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm active:bg-black/60 transition-colors"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted
            ? <VolumeX className="w-5 h-5 text-white" />
            : <Volume2 className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* Right-side action buttons (TikTok style) */}
      <div
        className="absolute right-3 bottom-32 flex flex-col items-center gap-5"
        style={{ zIndex: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Like */}
        <button
          onClick={() => user && likeMutation.mutate()}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          aria-label="Like"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${liked ? "bg-red-500/80" : "bg-black/40"} backdrop-blur-sm`}>
            <Heart className={`w-6 h-6 ${liked ? "text-white fill-white" : "text-white"}`} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{formatCount(localLikeCount)}</span>
        </button>

        {/* Comments */}
        <button className="flex flex-col items-center gap-1 active:scale-90 transition-transform" aria-label="Comments">
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{formatCount(signal.commentsCount ?? 0)}</span>
        </button>

        {/* Share */}
        <button
          onClick={() => navigator.share?.({ url: window.location.href, title: signal.title ?? "Signal" }).catch(() => {})}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          aria-label="Share"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{formatCount(signal.sharesCount ?? 0)}</span>
        </button>
      </div>

      {/* Bottom info */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-6 pr-20"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Author row */}
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

        {/* Title */}
        {signal.title && (
          <p className="text-white font-bold text-base mb-1 line-clamp-2 drop-shadow">{signal.title}</p>
        )}

        {/* Tags */}
        {signal.tags && signal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {signal.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-white/80 text-xs">#{tag}</span>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div
          className="w-full h-1 bg-white/30 rounded-full cursor-pointer mt-1"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
