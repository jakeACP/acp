import { useState, useRef, useEffect, memo } from "react";
import { Play, X } from "lucide-react";
import DOMPurify from "dompurify";
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
  tiktokUrl?: string;
  className?: string;
}

export const LazyTikTokThumbnail = memo(function LazyTikTokThumbnail({
  videoId,
  tiktokUrl,
  className = "",
}: LazyTikTokThumbnailProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const embedContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (embedHtml && embedContainerRef.current) {
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      embedContainerRef.current.appendChild(script);
      
      return () => {
        if (embedContainerRef.current && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [embedHtml]);

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

  const handlePlay = async () => {
    setIsLoading(true);
    setIsExpanded(true);
    
    try {
      const urlToFetch = tiktokUrl || `https://www.tiktok.com/@user/video/${videoId}`;
      const response = await fetch(`/api/tiktok/oembed?url=${encodeURIComponent(urlToFetch)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch TikTok embed');
      }
      
      const data = await response.json();
      setEmbedHtml(data.html);
    } catch (err) {
      setError('Unable to load TikTok video. Try opening in TikTok app.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsExpanded(false);
    setEmbedHtml(null);
    setError(null);
  };

  const openInTikTok = () => {
    const url = tiktokUrl || `https://www.tiktok.com/@user/video/${videoId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
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

      {isExpanded && (
        <div 
          className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex flex-col"
          onClick={handleClose}
        >
          <div className="flex items-center justify-between p-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
              <span className="text-white font-semibold">TikTok</span>
            </div>
            <button 
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div 
            className="flex-1 flex items-center justify-center p-4 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {isLoading && (
              <div className="text-center">
                <div className="w-12 h-12 border-3 border-white/30 border-t-[#00f2ea] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white/70">Loading TikTok video...</p>
              </div>
            )}

            {error && (
              <div className="text-center p-6 max-w-sm">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ff0050] to-[#00f2ea] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </div>
                <p className="text-white/80 text-lg mb-2">Video unavailable</p>
                <p className="text-white/50 text-sm mb-6">{error}</p>
                <button 
                  onClick={openInTikTok}
                  className="px-6 py-3 bg-gradient-to-r from-[#ff0050] to-[#00f2ea] rounded-full text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  Open in TikTok
                </button>
              </div>
            )}

            {embedHtml && (
              <div 
                ref={embedContainerRef}
                className="w-full max-w-md mx-auto"
                style={{ maxHeight: 'calc(100vh - 120px)' }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(embedHtml, { ADD_TAGS: ['iframe', 'blockquote'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] }) }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
});

interface LazyTikTokPlayerProps {
  videoId: string;
  tiktokUrl?: string;
  className?: string;
}

export const LazyTikTokPlayer = memo(function LazyTikTokPlayer({
  videoId,
  tiktokUrl,
  className = "",
}: LazyTikTokPlayerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const embedContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (isVisible && !embedHtml && !error) {
      const fetchEmbed = async () => {
        try {
          const urlToFetch = tiktokUrl || `https://www.tiktok.com/@user/video/${videoId}`;
          const response = await fetch(`/api/tiktok/oembed?url=${encodeURIComponent(urlToFetch)}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch TikTok embed');
          }
          
          const data = await response.json();
          setEmbedHtml(data.html);
        } catch (err) {
          setError('Unable to load TikTok video');
        } finally {
          setIsLoading(false);
        }
      };
      fetchEmbed();
    }
  }, [isVisible, videoId, tiktokUrl, embedHtml, error]);

  useEffect(() => {
    if (embedHtml && embedContainerRef.current) {
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      embedContainerRef.current.appendChild(script);
      
      return () => {
        if (embedContainerRef.current && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [embedHtml]);

  const openInTikTok = () => {
    const url = tiktokUrl || `https://www.tiktok.com/@user/video/${videoId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isVisible || isLoading) {
    return (
      <div ref={containerRef} className={`bg-gradient-to-br from-[#ff0050]/20 via-[#00f2ea]/20 to-black flex items-center justify-center ${className}`}>
        <div className="w-8 h-8 border-2 border-white/30 border-t-[#00f2ea] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div ref={containerRef} className={`bg-gradient-to-br from-[#ff0050]/30 via-[#00f2ea]/20 to-black flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <p className="text-white/70 text-sm mb-3">{error}</p>
          <button 
            onClick={openInTikTok}
            className="px-4 py-2 bg-black/50 rounded-full text-white text-sm font-medium border border-white/20 hover:bg-black/70 transition-colors"
          >
            Open in TikTok
          </button>
        </div>
      </div>
    );
  }

  if (embedHtml) {
    return (
      <div ref={containerRef} className={`bg-black ${className}`}>
        <div 
          ref={embedContainerRef}
          className="w-full flex justify-center"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(embedHtml, { ADD_TAGS: ['iframe', 'blockquote'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] }) }}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`bg-gradient-to-br from-[#ff0050]/20 via-[#00f2ea]/20 to-black flex items-center justify-center ${className}`}>
      <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
        <Play className="w-6 h-6 text-white" />
      </div>
    </div>
  );
});
