import { useState, useRef, useEffect } from "react";
import { Play, Pencil } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import type { SignalWithAuthor } from "@shared/schema";
import { EditSignalModal } from "../EditSignalModal";

interface SignalCardProps {
  signal: SignalWithAuthor;
}

export function SignalCard({ signal }: SignalCardProps) {
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const isOwner = !!user && user.id === signal.authorId;

  const [resolvedDuration, setResolvedDuration] = useState(signal.duration);
  const probeRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (signal.duration > 0 || !signal.videoUrl) return;
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = signal.videoUrl;
    v.onloadedmetadata = () => {
      if (isFinite(v.duration) && v.duration > 0) {
        setResolvedDuration(Math.round(v.duration));
      }
      v.src = '';
    };
    probeRef.current = v;
    return () => { v.onloadedmetadata = null; v.src = ''; };
  }, [signal.duration, signal.videoUrl]);

  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const durationStr = formatDuration(resolvedDuration);

  return (
    <>
      <Link href={`/mobile/signals/${signal.id}`}>
        <article className="glass-card cursor-pointer relative" data-testid={`signal-card-${signal.id}`}>
          <div className="video-thumbnail">
            {signal.thumbnailUrl ? (
              <img
                src={signal.thumbnailUrl}
                alt={signal.title || 'Signal'}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-900 to-red-900" />
            )}
            <div className="play-button-overlay">
              <Play className="w-5 h-5 text-gray-800 ml-0.5" fill="currentColor" />
            </div>
          </div>

          <div className="absolute top-3 left-3 z-10">
            <span className="type-tag signal">Signal</span>
          </div>

          {isOwner && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditOpen(true); }}
              className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm active:bg-black/70 transition-colors"
              aria-label="Edit signal"
            >
              <Pencil className="w-3.5 h-3.5 text-white" />
            </button>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
            <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">
              {signal.title || 'Untitled Signal'}
            </h3>
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <span>{signal.author?.username || 'Anonymous'}</span>
              {durationStr && (
                <>
                  <span>•</span>
                  <span>{durationStr}</span>
                </>
              )}
            </div>
          </div>
        </article>
      </Link>

      {editOpen && (
        <EditSignalModal signal={signal} onClose={() => setEditOpen(false)} />
      )}
    </>
  );
}
