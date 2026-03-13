import { useEffect, useRef, useState } from 'react';
import { useFloatingVideo } from '@/contexts/floating-video-context';
import { Button } from './ui/button';
import { X, Maximize2 } from 'lucide-react';

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
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const originalSlotRef = useRef<HTMLDivElement>(null);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { floatingPostId, activate, deactivate, returnToPost } = useFloatingVideo();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const isFloating = floatingPostId === postId;

  useEffect(() => {
    let mounted = true;

    async function initPlayer() {
      await loadYouTubeAPI();
      if (!mounted || !playerWrapperRef.current) return;

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

  // IntersectionObserver: activate floating when playing video scrolls out of view
  useEffect(() => {
    if (!containerRef.current || isFloating) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (isPlaying && entry.intersectionRatio < 0.2 && entry.intersectionRatio >= 0) {
            activate(postId);
          }
        });
      },
      { threshold: [0, 0.2, 0.5, 1.0] }
    );

    observerRef.current.observe(containerRef.current);
    return () => observerRef.current?.disconnect();
  }, [isPlaying, postId, isFloating, activate]);

  // Move player DOM node to/from document.body to escape ancestor transforms/backdrop-filters
  useEffect(() => {
    const playerWrapper = playerWrapperRef.current;
    if (!playerWrapper) return;

    if (isFloating) {
      // Build a portal container appended to document.body
      const portal = document.createElement('div');
      portal.style.cssText = [
        'position: fixed',
        'bottom: 16px',
        'right: 16px',
        'z-index: 9999',
        'width: min(90vw, 400px)',
        'aspect-ratio: 16 / 9',
        'border-radius: 12px',
        'overflow: hidden',
        'background: #000',
        'box-shadow: 0 8px 32px rgba(0,0,0,0.5)',
      ].join(';');
      portal.setAttribute('data-testid', 'floating-video-player');

      // Controls overlay
      const controls = document.createElement('div');
      controls.style.cssText = 'position:absolute;top:8px;right:8px;display:flex;gap:8px;z-index:10;';

      const makeBtn = (label: string, testId: string, onClick: () => void) => {
        const btn = document.createElement('button');
        btn.title = label;
        btn.setAttribute('data-testid', testId);
        btn.style.cssText = [
          'width:32px', 'height:32px', 'border-radius:6px',
          'background:rgba(0,0,0,0.7)', 'border:none', 'cursor:pointer',
          'color:#fff', 'display:flex', 'align-items:center', 'justify-content:center',
          'font-size:14px',
        ].join(';');
        btn.innerHTML = label === 'Return to post'
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        btn.addEventListener('click', onClick);
        return btn;
      };

      controls.appendChild(makeBtn('Return to post', 'button-return-to-post', returnToPost));
      controls.appendChild(makeBtn('Close', 'button-close-floating-video', deactivate));

      portal.appendChild(playerWrapper);
      portal.appendChild(controls);
      document.body.appendChild(portal);
      portalContainerRef.current = portal;
    } else {
      // Move player back to the original slot
      if (portalContainerRef.current) {
        portalContainerRef.current.remove();
        portalContainerRef.current = null;
      }
      if (originalSlotRef.current && !originalSlotRef.current.contains(playerWrapper)) {
        originalSlotRef.current.appendChild(playerWrapper);
      }
    }
  }, [isFloating, activate, deactivate, returnToPost]);

  const playerId = `youtube-player-${postId}-${videoId}`;

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ paddingBottom: '56.25%' }}
      data-video-id={videoId}
      data-post-id={postId}
    >
      {/* Slot that holds the player when not floating */}
      <div
        ref={originalSlotRef}
        className="absolute top-0 left-0 w-full h-full rounded-lg overflow-hidden"
      >
        {/* Player wrapper — moved to body portal when floating */}
        <div
          ref={playerWrapperRef}
          className="w-full h-full"
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
