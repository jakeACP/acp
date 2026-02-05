import { useState, useEffect, useRef, memo } from "react";
import { ExternalLink, Play, Loader2 } from "lucide-react";
import DOMPurify from "dompurify";

interface TikTokEmbedProps {
  videoId: string;
  tiktokUrl?: string;
}

export const TikTokEmbed = memo(function TikTokEmbed({
  videoId,
  tiktokUrl,
}: TikTokEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
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
      { threshold: 0.1, rootMargin: '100px' }
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
      const existingScript = document.querySelector('script[src="https://www.tiktok.com/embed.js"]');
      
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://www.tiktok.com/embed.js';
        script.async = true;
        document.body.appendChild(script);
      } else {
        if ((window as any).tiktokEmbed) {
          (window as any).tiktokEmbed.lib.render();
        }
      }
    }
  }, [embedHtml]);

  const openInTikTok = () => {
    const url = tiktokUrl || `https://www.tiktok.com/@user/video/${videoId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isVisible || isLoading) {
    return (
      <div 
        ref={containerRef} 
        className="relative w-full max-w-[325px] mx-auto rounded-xl overflow-hidden"
        style={{ aspectRatio: '9/16', minHeight: '400px' }}
        data-testid={`tiktok-loading-${videoId}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff0050]/20 via-[#00f2ea]/20 to-black flex items-center justify-center">
          {isVisible ? (
            <Loader2 className="w-10 h-10 text-white/70 animate-spin" />
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-black/50 flex items-center justify-center border border-white/20">
                <Play className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/60 text-sm">TikTok Video</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        ref={containerRef} 
        className="relative w-full max-w-[325px] mx-auto rounded-xl overflow-hidden"
        style={{ aspectRatio: '9/16', minHeight: '400px' }}
        data-testid={`tiktok-error-${videoId}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff0050]/30 via-[#00f2ea]/20 to-black flex items-center justify-center">
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/50 flex items-center justify-center border border-white/20">
              <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
                <path d="M38.4 21.8V10.2h-6c0-3.6-2.9-6.5-6.5-6.5-3.6 0-6.5 2.9-6.5 6.5v14.4c0 2-1.6 3.6-3.6 3.6-2 0-3.6-1.6-3.6-3.6 0-2 1.6-3.6 3.6-3.6v-6c-5.3 0-9.6 4.3-9.6 9.6 0 5.3 4.3 9.6 9.6 9.6 5.3 0 9.6-4.3 9.6-9.6V14.9c1.7 1.4 3.9 2.3 6.3 2.3V10.2" fill="currentColor" className="text-white"/>
              </svg>
            </div>
            <p className="text-white/70 text-sm mb-4">{error}</p>
            <button 
              onClick={openInTikTok}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black/60 rounded-full text-white text-sm font-medium border border-white/20 hover:bg-black/80 hover:border-white/40 transition-all"
              data-testid={`tiktok-open-${videoId}`}
            >
              <ExternalLink className="w-4 h-4" />
              Open in TikTok
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (embedHtml) {
    return (
      <div 
        ref={containerRef} 
        className="w-full max-w-[325px] mx-auto rounded-xl overflow-hidden bg-black"
        data-testid={`tiktok-embed-${videoId}`}
      >
        <div 
          ref={embedContainerRef}
          className="w-full flex justify-center [&>blockquote]:!max-w-full [&>blockquote]:!min-w-0"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(embedHtml, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] }) }}
        />
      </div>
    );
  }

  return null;
});
