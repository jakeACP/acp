import { useEffect, useRef, useState } from 'react';
import { useFloatingVideo } from '@/contexts/floating-video-context';

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
  isFloating?: boolean;
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

export function YouTubeEmbed({ videoId, postId, isFloating = false }: YouTubeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { activate, deactivate } = useFloatingVideo();
  const observerRef = useRef<IntersectionObserver | null>(null);

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
            
            // If video starts playing and we're not floating, we might want to activate
            if (playing && !isFloating) {
              // Don't activate immediately - wait for scroll out of view
            }
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
  }, [videoId, postId, isFloating]);

  // Intersection Observer for non-floating players
  useEffect(() => {
    if (isFloating || !containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ratio = entry.intersectionRatio;
          
          // If video is playing and scrolled mostly out of view (less than 20% visible)
          if (isPlaying && ratio < 0.2 && ratio >= 0) {
            activate(videoId, postId, playerRef.current);
          }
          
          // If video comes back into view while floating, deactivate floating mode
          if (isPlaying && ratio > 0.5) {
            deactivate();
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
  }, [isPlaying, videoId, postId, isFloating, activate, deactivate]);

  const playerId = `youtube-player-${postId}-${videoId}`;

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isFloating ? '' : 'mb-4'}`}
      style={isFloating ? { width: '400px', height: '225px' } : { paddingBottom: '56.25%' }}
      data-video-id={videoId}
      data-post-id={postId}
    >
      <div
        id={playerId}
        className={isFloating ? 'w-full h-full' : 'absolute top-0 left-0 w-full h-full rounded-lg'}
      />
    </div>
  );
}
