import { useEffect, useRef, useState, useCallback } from 'react';
import { useFloatingVideo } from '@/contexts/floating-video-context';
import { X, Maximize, ArrowUp } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeEmbedProps {
  videoId: string;
  postId: string;
}

let apiLoaded = false;
let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      apiLoaded = true;
      resolve();
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    (window as any).onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      resolve();
    };
  });

  return apiLoadPromise;
}

export function YouTubeEmbed({ videoId, postId }: YouTubeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { floatingPostId, activate, deactivate } = useFloatingVideo();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const isFloating = floatingPostId === postId;

  useEffect(() => {
    let mounted = true;

    async function initPlayer() {
      await loadYouTubeAPI();
      if (!mounted || !containerRef.current) return;

      const playerId = `youtube-player-${postId}-${videoId}`;

      playerRef.current = new (window as any).YT.Player(playerId, {
        videoId,
        playerVars: { enablejsapi: 1, origin: window.location.origin },
        events: {
          onStateChange: (event: any) => {
            const playing = event.data === (window as any).YT.PlayerState.PLAYING;
            setIsPlaying(playing);
          },
        },
      });
    }

    initPlayer();

    return () => {
      mounted = false;
      if (playerRef.current?.destroy) playerRef.current.destroy();
    };
  }, [videoId, postId]);

  // Fullscreen: ask the browser to fullscreen the YouTube iframe
  const handleFullscreen = useCallback(() => {
    const iframe: HTMLIFrameElement | null =
      playerRef.current?.getIframe?.() ??
      document.getElementById(`youtube-player-${postId}-${videoId}`)?.querySelector('iframe') ??
      null;

    if (iframe?.requestFullscreen) {
      iframe.requestFullscreen().catch(() => {});
    } else if ((iframe as any)?.webkitRequestFullscreen) {
      (iframe as any).webkitRequestFullscreen();
    }
  }, [postId, videoId]);

  // Return to feed: scroll the player back into view and deactivate floating
  const handleReturn = useCallback(() => {
    deactivate();
    // Small delay so the element is back in normal flow before we scroll to it
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, [deactivate]);

  // Close: pause the video first so the IntersectionObserver can't immediately
  // re-activate floating (it only fires when isPlaying === true)
  const handleClose = useCallback(() => {
    playerRef.current?.pauseVideo?.();
    deactivate();
  }, [deactivate]);

  // IntersectionObserver: activate floating when video is playing and scrolled out of view
  useEffect(() => {
    if (!containerRef.current || isFloating) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Activate floating once video is playing and scrolled mostly out of view
          if (isPlaying && entry.intersectionRatio < 0.2) {
            activate(postId);
          }
        });
      },
      { threshold: [0, 0.2, 0.5, 1.0] }
    );

    observerRef.current.observe(containerRef.current);
    return () => observerRef.current?.disconnect();
  }, [isPlaying, postId, isFloating, activate]);

  const playerId = `youtube-player-${postId}-${videoId}`;

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ paddingBottom: '56.25%' }}
      data-video-id={videoId}
      data-post-id={postId}
    >
      {/* ── Floating shell ─────────────────────────────────────────────────
          When floating, the outer div is fixed to the viewport corner.
          Controls live in a header bar ABOVE the iframe so they are never
          covered by it (iframes eat all pointer-events inside their bounds).
          ─────────────────────────────────────────────────────────────────── */}
      <div
        className={
          isFloating
            ? 'fixed bottom-4 right-4 z-[9999] rounded-xl overflow-hidden bg-black shadow-2xl transition-all duration-300 flex flex-col'
            : 'absolute top-0 left-0 w-full h-full rounded-lg overflow-hidden'
        }
        style={isFloating ? { width: 'min(90vw, 400px)' } : undefined}
        data-testid={isFloating ? 'floating-video-player' : undefined}
      >
        {/* Control bar — rendered ABOVE the iframe, never overlapping it */}
        {isFloating && (
          <div className="flex items-center justify-between px-2 bg-black/90 shrink-0 h-9">
            <span className="text-white/50 text-xs select-none">Playing</span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReturn}
                title="Return to feed"
                data-testid="button-return-to-post"
                className="h-7 w-7 rounded flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                onClick={handleFullscreen}
                title="Fullscreen"
                data-testid="button-fullscreen-video"
                className="h-7 w-7 rounded flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Maximize className="h-4 w-4" />
              </button>
              <button
                onClick={handleClose}
                title="Close"
                data-testid="button-close-floating-video"
                className="h-7 w-7 rounded flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* YouTube player — fills remaining space */}
        <div
          className={isFloating ? 'w-full' : 'w-full h-full'}
          style={isFloating ? { aspectRatio: '16/9' } : undefined}
        >
          <div id={playerId} className="w-full h-full" />
        </div>
      </div>

      {/* Placeholder shown in the feed while video is floating */}
      {isFloating && (
        <div className="absolute top-0 left-0 w-full h-full bg-black/10 rounded-lg flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Video playing in corner →</p>
        </div>
      )}
    </div>
  );
}
