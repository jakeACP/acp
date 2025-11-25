import { Play } from "lucide-react";
import { Link } from "wouter";
import type { SignalWithAuthor } from "@shared/schema";

interface SignalCardProps {
  signal: SignalWithAuthor;
}

export function SignalCard({ signal }: SignalCardProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Link href={`/mobile/signals/${signal.id}`}>
      <article className="glass-card cursor-pointer" data-testid={`signal-card-${signal.id}`}>
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
        
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">
            {signal.title || 'Untitled Signal'}
          </h3>
          <div className="flex items-center gap-2 text-white/70 text-xs">
            <span>{signal.author?.username || 'Anonymous'}</span>
            <span>•</span>
            <span>{formatDuration(signal.duration)}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
