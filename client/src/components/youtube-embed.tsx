import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingVideo } from '@/contexts/floating-video-context';
import { Button } from './ui/button';
import { X, Maximize2 } from 'lucide-react';

// TypeScript declarations for YouTube IFrame API
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

// Load YouTube IFrame API script
let apiLoaded = false;
let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) {
    return Promise.resolve();
  }
  
  if (apiLoadPromise) {
    return apiLoadPromise;
  }

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
  const { floatingPostId, activate, deactivate, returnToPost } = useFloatingVideo();
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
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
        },
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
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [videoId, postId]);

  // Intersection Observer for detecting when video scrolls out of view
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ratio = entry.intersectionRatio;
          
          // Only activate floating if not already floating and video is playing
          if (!isFloating && isPlaying && ratio < 0.2 && ratio >= 0) {
            activate(postId);
          }
        });
      },
      {
        threshold: [0, 0.2, 0.5, 1.0],
      }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isPlaying, postId, isFloating, activate]);

  const playerId = `youtube-player-${postId}-${videoId}`;

  const playerContent = (
    <div
      className={isFloating ? 'w-full h-full' : 'absolute top-0 left-0 w-full h-full rounded-lg'}
    >
      <div
        id={playerId}
        className="w-full h-full"
      />
    </div>
  );

  const floatingOverlay = isFloating && (
    <div className="absolute top-2 right-2 flex gap-2 z-10">
      <Button
        size="sm"
        variant="secondary"
        className="h-8 w-8 p-0 bg-black/70 hover:bg-black/90 text-white"
        onClick={returnToPost}
        title="Return to post"
        data-testid="button-return-to-post"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className="h-8 w-8 p-0 bg-black/70 hover:bg-black/90 text-white"
        onClick={deactivate}
        title="Close"
        data-testid="button-close-floating-video"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  if (isFloating) {
    return (
      <>
        {/* Placeholder in original position */}
        <div
          ref={containerRef}
          className="relative w-full mb-4 bg-black/10 rounded-lg"
          style={{ paddingBottom: '56.25%' }}
          data-video-id={videoId}
          data-post-id={postId}
        />
        {/* Floating player */}
        {createPortal(
          <div
            className="fixed bottom-4 right-4 z-50 shadow-2xl rounded-lg overflow-hidden bg-black"
            style={{ width: '400px', height: '225px' }}
            data-testid="floating-video-player"
          >
            <div className="relative w-full h-full">
              {playerContent}
              {floatingOverlay}
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full mb-4"
      style={{ paddingBottom: '56.25%' }}
      data-video-id={videoId}
      data-post-id={postId}
    >
      {playerContent}
    </div>
  );
}
