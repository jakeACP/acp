import { useState, useRef, useEffect, memo } from "react";
import { Play } from "lucide-react";
import { getYouTubeThumbnail } from "../utils/youtube";

interface LazyYouTubeThumbnailProps {
  videoId: string;
  className?: string;
  showPlayButton?: boolean;
  quality?: 'default' | 'hqdefault' | 'mqdefault' | 'sddefault' | 'maxresdefault';
}

export const LazyYouTubeThumbnail = memo(function LazyYouTubeThumbnail({
  videoId,
  className = "",
  showPlayButton = true,
  quality = 'hqdefault',
}: LazyYouTubeThumbnailProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const thumbnailUrl = getYouTubeThumbnail(videoId, quality);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden bg-black/20 ${className}`}
    >
      {isVisible ? (
        <>
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {showPlayButton && isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Play className="w-4 h-4 text-white/50" />
          </div>
        </div>
      )}
    </div>
  );
});

interface LazyYouTubePlayerProps {
  videoId: string;
  autoplay?: boolean;
  className?: string;
}

export const LazyYouTubePlayer = memo(function LazyYouTubePlayer({
  videoId,
  autoplay = false,
  className = "",
}: LazyYouTubePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const thumbnailUrl = getYouTubeThumbnail(videoId, 'hqdefault');
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

  if (!isVisible) {
    return (
      <div ref={containerRef} className={`bg-black/20 flex items-center justify-center ${className}`}>
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
          <Play className="w-6 h-6 text-white/50" />
        </div>
      </div>
    );
  }

  if (isPlaying) {
    return (
      <div ref={containerRef} className={className}>
        <iframe
          src={embedUrl}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative cursor-pointer group ${className}`}
      onClick={() => setIsPlaying(true)}
    >
      <img
        src={thumbnailUrl}
        alt="Video thumbnail"
        loading="lazy"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
          <Play className="w-8 h-8 text-white fill-white ml-1" />
        </div>
      </div>
    </div>
  );
});
