import { useEffect, useRef, useState, useCallback } from 'react';
import { useFloatingVideo } from '@/contexts/floating-video-context';
import { X, Maximize, PictureInPicture2, ArrowUpFromLine } from 'lucide-react';

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

  const isFloating = floatingPostId === postId;

  // ── YouTube player init ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function initPlayer() {
      await loadYouTubeAPI();
      if (!mounted) return;

      const id = `yt-player-${postId}-${videoId}`;

      playerRef.current = new window.YT.Player(id, {
        videoId,
        playerVars: { enablejsapi: 1, origin: window.location.origin },
        events: {
          onStateChange: (e: any) => {
            setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    }

    initPlayer();
    return () => {
      mounted = false;
      playerRef.current?.destroy?.();
    };
  }, [videoId, postId]);

  // ── Actions ──────────────────────────────────────────────────────────
  const handlePopOut = useCallback(() => activate(postId), [activate, postId]);

  const handleReturn = useCallback(() => {
    deactivate();
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, [deactivate]);

  const handleClose = useCallback(() => {
    playerRef.current?.pauseVideo?.();
    deactivate();
  }, [deactivate]);

  const handleFullscreen = useCallback(() => {
    const iframe: HTMLIFrameElement | null =
      playerRef.current?.getIframe?.() ??
      document.getElementById(`yt-player-${postId}-${videoId}`)?.querySelector('iframe') ??
      null;
    if (iframe?.requestFullscreen) iframe.requestFullscreen().catch(() => {});
    else if ((iframe as any)?.webkitRequestFullscreen) (iframe as any).webkitRequestFullscreen();
  }, [postId, videoId]);

  // ── Render ───────────────────────────────────────────────────────────
  const playerId = `yt-player-${postId}-${videoId}`;

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ paddingBottom: '56.25%' }}
      data-video-id={videoId}
      data-post-id={postId}
    >
      <div
        className={
          isFloating
            ? 'fixed bottom-4 right-4 z-[9999] rounded-xl overflow-hidden bg-black shadow-2xl flex flex-col'
            : 'absolute top-0 left-0 w-full h-full rounded-lg overflow-hidden'
        }
        style={isFloating ? { width: 'min(90vw, 400px)' } : undefined}
        data-testid={isFloating ? 'floating-video-player' : undefined}
      >
        {/* ── Floating control bar (above iframe — always clickable) ──── */}
        {isFloating && (
          <div className="flex items-center justify-between px-2 bg-gradient-to-r from-black/95 to-black/85 shrink-0 h-9">
            <span className="text-white/50 text-xs select-none truncate">Now playing</span>
            <div className="flex items-center gap-0.5">
              <ControlButton onClick={handleReturn} title="Return to feed">
                <ArrowUpFromLine className="h-3.5 w-3.5" />
              </ControlButton>
              <ControlButton onClick={handleFullscreen} title="Fullscreen">
                <Maximize className="h-3.5 w-3.5" />
              </ControlButton>
              <ControlButton onClick={handleClose} title="Close">
                <X className="h-3.5 w-3.5" />
              </ControlButton>
            </div>
          </div>
        )}

        {/* ── YouTube iframe ──────────────────────────────────────────── */}
        <div
          className={isFloating ? 'w-full' : 'w-full h-full'}
          style={isFloating ? { aspectRatio: '16/9' } : undefined}
        >
          <div id={playerId} className="w-full h-full" />
        </div>
      </div>

      {/* ── Inline "pop out" button (shown when playing & not floating) ─ */}
      {isPlaying && !isFloating && (
        <button
          onClick={handlePopOut}
          title="Pop out to corner"
          className="absolute top-2 right-2 z-10 h-8 w-8 rounded-md flex items-center justify-center bg-black/60 hover:bg-black/80 text-white/80 hover:text-white transition-colors"
        >
          <PictureInPicture2 className="h-4 w-4" />
        </button>
      )}

      {/* ── Placeholder while floating ─────────────────────────────────── */}
      {isFloating && (
        <div className="absolute top-0 left-0 w-full h-full bg-black/10 rounded-lg flex items-center justify-center cursor-pointer" onClick={handleReturn}>
          <p className="text-sm text-muted-foreground">Video playing in corner — click to return</p>
        </div>
      )}
    </div>
  );
}

function ControlButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="h-7 w-7 rounded flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
    >
      {children}
    </button>
  );
}
