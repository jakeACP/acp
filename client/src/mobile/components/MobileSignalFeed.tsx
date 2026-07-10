/**
 * MobileSignalFeed — TikTok-style full-screen vertical snap feed.
 *
 * Performance optimisations applied:
 *  • Windowed rendering — only current slide ±1 are mounted as full
 *    SignalFeedItem elements; all others are lightweight black placeholders
 *    that keep scroll-snap geometry intact without DOM cost.
 *  • Video prefetch — when the active slide advances, the next upload video
 *    URL is preloaded via a <link rel="preload"> hint so it buffers before
 *    the swipe reaches it.
 *  • IntersectionObserver per slide (threshold 0.7) drives activeIndex;
 *    observers keyed by number to avoid string allocation per scroll frame.
 *  • gcTime: 5 min — signals stay in cache between tab switches.
 *  • refetchOnWindowFocus: false — coming back from background doesn't
 *    interrupt mid-feed playback.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SignalWithAuthor } from "@shared/schema";
import { SignalFeedItem } from "./SignalFeedItem";

/** Render full SignalFeedItem for current ±WINDOW slides; placeholder for the rest */
const RENDER_WINDOW = 1;

interface MobileSignalFeedProps {
  onGridClick: () => void;
}

export function MobileSignalFeed({ onGridClick }: MobileSignalFeedProps) {
  const scrollRef    = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [muted,       setMuted]       = useState(true);
  const observersRef  = useRef<Map<number, IntersectionObserver>>(new Map());
  const prefetchLink  = useRef<HTMLLinkElement | null>(null);

  const { data: signals = [], isLoading } = useQuery<SignalWithAuthor[]>({
    queryKey: ["/api/mobile/signals"],
    queryFn: async () => {
      const res = await fetch("/api/mobile/signals?limit=50", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load signals");
      return res.json();
    },
    staleTime: 60_000,
    gcTime:    5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // ── Prefetch next upload video ──────────────────────────────────────────
  useEffect(() => {
    const next = signals[activeIndex + 1];
    const url  = next?.videoUrl;
    if (!url?.startsWith("/uploads/")) {
      prefetchLink.current?.remove();
      prefetchLink.current = null;
      return;
    }
    if (prefetchLink.current?.getAttribute("href") === url) return;
    prefetchLink.current?.remove();
    const link = document.createElement("link");
    link.rel  = "preload";
    link.as   = "video";
    link.setAttribute("href", url);
    document.head.appendChild(link);
    prefetchLink.current = link;
    return () => { link.remove(); };
  }, [activeIndex, signals]);

  // ── Per-slide IntersectionObserver (index-keyed) ────────────────────────
  const observeSlide = useCallback((el: HTMLElement | null, index: number) => {
    if (!el) {
      const obs = observersRef.current.get(index);
      if (obs) { obs.disconnect(); observersRef.current.delete(index); }
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
          setActiveIndex(index);
        }
      },
      { root: scrollRef.current, threshold: 0.7 },
    );
    obs.observe(el);
    observersRef.current.set(index, obs);
  }, []);

  useEffect(() => {
    const map = observersRef.current;
    return () => { map.forEach((o) => o.disconnect()); map.clear(); };
  }, []);

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="signal-feed-container flex items-center justify-center"
        aria-label="Loading Signals"
        aria-busy="true"
        role="status"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full skeleton" aria-hidden="true" />
          <div className="w-36 h-4 rounded-full skeleton" aria-hidden="true" />
          <div className="w-28 h-3 rounded-full skeleton opacity-60" aria-hidden="true" />
          <span className="sr-only">Loading signals…</span>
        </div>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div
        className="signal-feed-container flex flex-col items-center justify-center gap-4"
        role="status"
      >
        <span className="text-5xl" aria-hidden="true">📹</span>
        <p className="text-white/60 text-base font-medium">No Signals yet</p>
        <p className="text-white/35 text-sm">Be the first to record one</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="signal-feed-container"
      role="feed"
      aria-label="Signals video feed"
    >
      {signals.map((signal, index) => {
        const withinWindow = Math.abs(index - activeIndex) <= RENDER_WINDOW;
        const isActive     = index === activeIndex;

        return (
          <div
            key={signal.id}
            ref={(el) => observeSlide(el, index)}
            className="signal-feed-slide"
            aria-label={`Signal ${index + 1} of ${signals.length}${isActive ? ", currently playing" : ""}`}
            aria-hidden={!isActive}
          >
            {withinWindow ? (
              <SignalFeedItem
                signal={signal}
                isActive={isActive}
                muted={muted}
                onMuteToggle={() => setMuted((p) => !p)}
                onGridClick={onGridClick}
              />
            ) : (
              /* Placeholder keeps scroll-snap geometry; zero render cost */
              <div className="absolute inset-0 bg-black" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}
