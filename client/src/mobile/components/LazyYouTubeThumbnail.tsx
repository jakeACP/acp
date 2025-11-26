import { useState, useRef, useEffect, memo } from "react";
import { Play } from "lucide-react";
import { getYouTubeThumbnail, getTikTokEmbedUrl } from "../utils/youtube";

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

interface LazyTikTokThumbnailProps {
  videoId: string;
  className?: string;
}

export const LazyTikTokThumbnail = memo(function LazyTikTokThumbnail({
  videoId,
  className = "",
}: LazyTikTokThumbnailProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handlePlay = () => {
    setIsLoading(true);
    setIsPlaying(true);
  };

  const embedUrl = getTikTokEmbedUrl(videoId);

  if (isPlaying) {
    return (
      <div 
        ref={containerRef}
        className={`relative overflow-hidden bg-black ${className}`}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#ff0050]/20 via-[#00f2ea]/20 to-black z-10">
            <div className="w-8 h-8 border-2 border-white/30 border-t-[#00f2ea] rounded-full animate-spin" />
          </div>
        )}
        <iframe
          src={embedUrl}
          title="TikTok video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0"
          style={{ minHeight: '400px' }}
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden bg-gradient-to-br from-[#ff0050]/30 via-[#00f2ea]/20 to-black cursor-pointer group ${className}`}
      onClick={isVisible ? handlePlay : undefined}
    >
      {isVisible ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-black/80 flex items-center justify-center mb-3 shadow-xl group-hover:scale-110 transition-transform border border-white/20">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
            <div className="flex items-center justify-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" fill="white"/>
              </svg>
              <span className="text-white/90 text-sm font-semibold">TikTok</span>
            </div>
            <p className="text-white/60 text-xs mt-2">Tap to play</p>
          </div>
        </div>
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

interface LazyTikTokPlayerProps {
  videoId: string;
  className?: string;
}

export const LazyTikTokPlayer = memo(function LazyTikTokPlayer({
  videoId,
  className = "",
}: LazyTikTokPlayerProps) {
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

  const embedUrl = getTikTokEmbedUrl(videoId);

  if (!isVisible) {
    return (
      <div ref={containerRef} className={`bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center ${className}`}>
        <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
          <Play className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <iframe
        src={embedUrl}
        title="TikTok video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
      />
    </div>
  );
});
